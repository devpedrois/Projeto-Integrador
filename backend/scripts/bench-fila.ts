import "dotenv/config";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { setTimeout as esperar } from "node:timers/promises";
import { cpus, platform, arch } from "node:os";
import { Pool } from "pg";
import type { PoolClient } from "pg";
import type { PgBoss } from "pg-boss";
import { gerarVolume } from "../prisma/seeds/volume.js";
import { runVolumeSeed } from "../prisma/seed-volume.js";
import { createPrismaClient } from "../src/database/prisma/client.js";
import type { PrismaClient } from "../src/generated/prisma/client.js";
import {
  createPgBossClient,
  ensureNotificarArtesaoQueue,
  NOTIFICAR_ARTESAO_QUEUE,
} from "../src/queues/pg-boss.client.js";
import { publicarIntencao } from "../src/queues/notificacao.publisher.js";
import { PrismaIntencaoNotificacaoRepository } from "../src/repositories/intencao-notificacao.repository.js";
import {
  BenchFilaError,
  CONFIGURACAO_BENCH,
  conferirRodada,
  criarCsv,
  prepararIntencoes,
  resumirRodadas,
  validarBenchEnvironment,
} from "./lib/bench-fila.js";
import { iniciarWorkerBench } from "./lib/bench-fila-processos.js";

interface RodadaOptions {
  prisma: PrismaClient;
  boss: PgBoss;
  pool: Pool;
  schema: string;
  dataSchema?: string;
  databaseUrl: string;
  pedidoIds: string[];
  workers: number;
  latenciaMs: number;
  rodada: number;
  aquecimento: boolean;
  progresso(message: string): void;
  signal?: AbortSignal;
}

async function encerrarWorkers(
  processos: Awaited<ReturnType<typeof iniciarWorkerBench>>[],
) {
  const paradas = await Promise.allSettled(
    processos.map((processo) => processo.stop()),
  );
  if (paradas.some((parada) => parada.status === "rejected"))
    throw new BenchFilaError("falha ao encerrar workers.");
}

async function removerFila(
  pool: Pool,
  schema: string,
  pasta: string,
  concluido: boolean,
) {
  await pool.query(`DROP SCHEMA IF EXISTS "${validarSchema(schema)}" CASCADE`);
  const { rows } = await pool.query<{ existe: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = $1) AS existe",
    [schema],
  );
  await writeFile(
    resolve(pasta, "limpeza.json"),
    JSON.stringify(
      { schemaFila: schema, existe: rows[0]?.existe, concluido },
      null,
      2,
    ),
  );
  if (rows[0]?.existe !== false)
    throw new BenchFilaError("schema temporario da fila nao foi removido.");
}

function validarSchema(schema: string) {
  if (!/^bench_fila_[a-f0-9]{32}$/.test(schema))
    throw new BenchFilaError("schema da fila invalido.");
  return schema;
}

function nomearConexao(connectionString: string, applicationName: string) {
  const url = new URL(connectionString);
  url.searchParams.set("application_name", applicationName);
  return url.toString();
}

async function diagnosticarFila(pool: Pool, schema: string) {
  validarSchema(schema);
  const { rows } = await pool.query<{
    jobsConcluidos: number;
    jobsFalhos: number;
    retries: number;
    medianaExecucaoMs: number;
    medianaIntervaloInicioMs: number;
  }>(
    `
    WITH jobs AS (
      SELECT *, EXTRACT(EPOCH FROM (started_on - lag(started_on) OVER (ORDER BY started_on))) * 1000 AS intervalo_ms
      FROM "${schema}".job WHERE name = $1
    )
    SELECT count(*) FILTER (WHERE state = 'completed')::int AS "jobsConcluidos",
      count(*) FILTER (WHERE state = 'failed')::int AS "jobsFalhos",
      coalesce(sum(retry_count), 0)::int AS retries,
      coalesce(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_on - started_on)) * 1000)
        FILTER (WHERE completed_on IS NOT NULL), 0)::float8 AS "medianaExecucaoMs",
      coalesce(percentile_cont(0.5) WITHIN GROUP (ORDER BY intervalo_ms), 0)::float8 AS "medianaIntervaloInicioMs"
    FROM jobs`,
    [NOTIFICAR_ARTESAO_QUEUE],
  );
  const diagnostico = rows[0];
  if (!diagnostico) throw new BenchFilaError("diagnostico da fila ausente.");
  return diagnostico;
}

async function amostrarConexoes(pool: Pool, prefixo: string) {
  const { rows } = await pool.query<{
    total: number;
    ativas: number;
    lock: number;
  }>(
    `
    SELECT count(*)::int AS total,
      count(*) FILTER (WHERE state = 'active')::int AS ativas,
      count(*) FILTER (WHERE wait_event_type = 'Lock')::int AS lock
    FROM pg_stat_activity WHERE datname = current_database() AND starts_with(application_name, $1)`,
    [prefixo],
  );
  return rows[0] ?? { total: 0, ativas: 0, lock: 0 };
}

export async function executarRodada(options: RodadaOptions) {
  const { prisma, boss, pool, schema, pedidoIds } = options;
  validarSchema(schema);
  const preparacao = await prepararIntencoes(prisma, pedidoIds);
  await boss.deleteAllJobs(NOTIFICAR_ARTESAO_QUEUE);
  const processos: Awaited<ReturnType<typeof iniciarWorkerBench>>[] = [];
  try {
    for (let indice = 0; indice < options.workers; indice++) {
      const url = nomearConexao(
        options.databaseUrl,
        `${schema}:worker-${indice}`,
      );
      processos.push(
        await iniciarWorkerBench({
          ...process.env,
          NODE_ENV: "test",
          DATABASE_URL: url,
          DIRECT_URL: url,
          WORKER_CONCURRENCY: "1",
          NOTIFICACAO_LATENCIA_MS: String(options.latenciaMs),
          BENCH_FILA_SCHEMA: schema,
          BENCH_FILA_DATA_SCHEMA: options.dataSchema ?? "public",
          NODE_NO_WARNINGS: "1",
        }),
      );
    }
    const pids = processos.map((processo) => processo.pid);
    if (new Set(pids).size !== options.workers)
      throw new BenchFilaError("processos worker nao sao distintos.");
    options.progresso(
      `W=${options.workers} rodada=${options.rodada} aquecimento=${options.aquecimento} pids=${pids.join(",")}`,
    );
    const repository = new PrismaIntencaoNotificacaoRepository(prisma);
    const inicioEm = new Date().toISOString();
    const inicio = performance.now();
    let publicadas = 0;
    for (const intencao of preparacao.intencoes) {
      if (options.signal?.aborted)
        throw new BenchFilaError("execucao interrompida.");
      if (processos.some((p) => !p.isRunning()))
        throw new BenchFilaError("worker encerrou durante a publicacao.");
      const publicada = await publicarIntencao(boss, repository, intencao);
      if (publicada === null) {
        const atual = await prisma.intencaoNotificacao.findUniqueOrThrow({
          where: { id: intencao.id },
        });
        if (atual.status !== "processada")
          throw new BenchFilaError("job nao foi publicado.");
      }
      publicadas++;
      if (publicadas % 100 === 0)
        options.progresso(
          `W=${options.workers} rodada=${options.rodada}: ${publicadas}/${pedidoIds.length} publicados; ${(performance.now() - inicio).toFixed(0)}ms`,
        );
    }
    const publicacaoMs = performance.now() - inicio;
    const amostras: {
      decorridoMs: number;
      processadas: number;
      total: number;
      ativas: number;
      lock: number;
    }[] = [];
    const limite =
      inicio + Math.max(120_000, (pedidoIds.length * 3_000) / options.workers);
    let proximaAmostra = 0;
    let processadas = 0;
    let duracaoMs: number;
    for (;;) {
      if (options.signal?.aborted)
        throw new BenchFilaError("execucao interrompida.");
      if (processos.some((p) => !p.isRunning()))
        throw new BenchFilaError("worker encerrou durante o processamento.");
      processadas = await prisma.intencaoNotificacao.count({
        where: { pedidoId: { in: pedidoIds }, status: "processada" },
      });
      const agora = performance.now();
      if (processadas === pedidoIds.length) {
        duracaoMs = agora - inicio;
        break;
      }
      if (agora > limite) throw new BenchFilaError("prazo da rodada excedido.");
      if (agora >= proximaAmostra) {
        amostras.push({
          decorridoMs: agora - inicio,
          processadas,
          ...(await amostrarConexoes(pool, schema)),
        });
        options.progresso(
          `W=${options.workers} rodada=${options.rodada}: ${processadas}/${pedidoIds.length} processadas; ${((agora - inicio) / 1000).toFixed(1)}s`,
        );
        proximaAmostra = agora + 10_000;
      }
      await esperar(CONFIGURACAO_BENCH.observacaoMs);
    }
    for (const processo of processos) await processo.stop();
    processos.length = 0;
    const conferencia = await conferirRodada(
      prisma,
      pedidoIds,
      preparacao.esperadas,
    );
    const diagnostico = await diagnosticarFila(pool, schema);
    if (
      diagnostico.jobsConcluidos !== pedidoIds.length ||
      diagnostico.jobsFalhos !== 0 ||
      diagnostico.retries !== 0
    )
      throw new BenchFilaError("jobs concluidos ou retries divergentes.");
    return {
      workers: options.workers,
      rodada: options.rodada,
      aquecimento: options.aquecimento,
      itens: pedidoIds.length,
      duracaoMs,
      publicacaoMs,
      inicioEm,
      fimEm: new Date().toISOString(),
      valida: true,
      publicadas,
      pids,
      ...conferencia,
      diagnostico,
      amostras,
    };
  } finally {
    await encerrarWorkers(processos);
  }
}

async function executarPython(python: string, args: string[]) {
  const child = spawn(python, args, {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.resume();
  child.stderr.resume();
  const code = await new Promise<number | null>((resolve, reject) => {
    child.once("error", () =>
      reject(new BenchFilaError("Python indisponivel.")),
    );
    child.once("close", resolve);
  });
  if (code !== 0)
    throw new BenchFilaError("grafico requer Python e Matplotlib funcionais.");
}

async function main(args: string[], env: NodeJS.ProcessEnv) {
  const databaseUrl = validarBenchEnvironment(env);
  let pasta: string;
  try {
    const { values } = parseArgs({
      args,
      allowPositionals: false,
      options: { saida: { type: "string" } },
    });
    const padrao = fileURLToPath(
      new URL(
        `../../evidencias/PI4-30/benchmark-fila/execucao-${new Date().toISOString().replaceAll(":", "-")}`,
        import.meta.url,
      ),
    );
    pasta = resolve(values.saida ?? padrao);
    await mkdir(dirname(pasta), { recursive: true });
    await mkdir(pasta);
  } catch {
    throw new BenchFilaError(
      "argumentos invalidos ou pasta de saida existente; use uma pasta nova.",
    );
  }
  const python = env.BENCH_FILA_PYTHON ?? "python";
  await executarPython(python, [
    "-c",
    "import matplotlib; matplotlib.use('Agg')",
  ]);
  const schema = `bench_fila_${randomUUID().replaceAll("-", "")}`;
  const controlUrl = new URL(databaseUrl);
  if (controlUrl.hostname.endsWith(".neon.tech"))
    controlUrl.hostname = controlUrl.hostname.replace(/-pooler(?=\.)/, "");
  const pool = new Pool({
    connectionString: nomearConexao(
      controlUrl.toString(),
      `${schema}:controle`,
    ),
    max: 3,
  });
  const prisma = createPrismaClient(
    nomearConexao(databaseUrl, `${schema}:prisma`),
  );
  const boss = createPgBossClient(
    nomearConexao(databaseUrl, `${schema}:publicador`),
    { schema },
  );
  let queueError = false;
  boss.on("error", () => {
    queueError = true;
  });
  const rodadas: Awaited<ReturnType<typeof executarRodada>>[] = [];
  let lock: PoolClient | undefined;
  let locked = false;
  let concluido = false;
  const interrupcao = new AbortController();
  const interromper = () => interrupcao.abort();
  process.once("SIGINT", interromper);
  process.once("SIGTERM", interromper);
  async function checkpoint(estado: string, extra: object = {}) {
    await writeFile(resolve(pasta, "rodadas.csv"), criarCsv(rodadas));
    await writeFile(
      resolve(pasta, "resultado.json"),
      JSON.stringify(
        {
          estado,
          configuracao: CONFIGURACAO_BENCH,
          schemaFila: schema,
          ambiente: {
            node: process.version,
            plataforma: platform(),
            arquitetura: arch(),
            cpu: cpus()[0]?.model,
            volumeUsaPooler: new URL(databaseUrl).hostname.includes("-pooler"),
          },
          rodadas,
          ...extra,
        },
        null,
        2,
      ),
    );
  }
  try {
    lock = await pool.connect();
    const { rows } = await lock.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock(hashtext('origem:bench-fila:30.5')) AS locked",
    );
    locked = rows[0]?.locked === true;
    if (!locked)
      throw new BenchFilaError("outro benchmark esta ativo nesta branch.");
    await checkpoint("preparando");
    const pedidos = gerarVolume().pedidos.slice(0, CONFIGURACAO_BENCH.itens);
    const pedidoIds = pedidos.map((p) => p.id);
    const existentes = await prisma.pedido.count({
      where: { id: { in: pedidoIds } },
    });
    if (existentes !== CONFIGURACAO_BENCH.itens)
      await prisma.$transaction((tx) => runVolumeSeed(tx), {
        timeout: 120_000,
      });
    const massa = await prisma.pedido.findMany({
      where: { id: { in: pedidoIds } },
      select: { id: true, numero: true, compradorId: true },
    });
    const esperados = new Map(pedidos.map((p) => [p.id, p]));
    if (
      massa.length !== 1000 ||
      massa.some(
        (p) =>
          esperados.get(p.id)?.numero !== p.numero ||
          esperados.get(p.id)?.compradorId !== p.compradorId,
      )
    )
      throw new BenchFilaError("massa sintetica de volume divergente.");
    const { rows: bancoInfo } = await pool.query(
      "SELECT current_setting('server_version') AS versao, current_setting('max_connections')::int AS max_conexoes",
    );
    const pgBossPackage: unknown = JSON.parse(
      await readFile(
        new URL("../node_modules/pg-boss/package.json", import.meta.url),
        "utf8",
      ),
    );
    const pgBossVersion =
      typeof pgBossPackage === "object" &&
      pgBossPackage !== null &&
      "version" in pgBossPackage
        ? String(pgBossPackage.version)
        : "indisponivel";
    await boss.start();
    await ensureNotificarArtesaoQueue(boss);
    console.log(
      "Latencia simulada: 200ms por job; canal externo ficticio; nenhum envio externo.",
    );
    console.log(
      "1000 pedidos do seed de volume; W=1,2,4; concorrencia interna=1; polling=1000ms.",
    );
    console.log(
      "Cinco rodadas validas + um aquecimento descartado por W; execucao sequencial.",
    );
    for (const workers of CONFIGURACAO_BENCH.workers) {
      for (let rodada = 0; rodada <= CONFIGURACAO_BENCH.rodadas; rodada++) {
        if (queueError)
          throw new BenchFilaError("erro na fila durante a execucao.");
        const resultado = await executarRodada({
          prisma,
          boss,
          pool,
          schema,
          databaseUrl,
          pedidoIds,
          workers,
          latenciaMs: CONFIGURACAO_BENCH.latenciaMs,
          rodada,
          aquecimento: rodada === 0,
          signal: interrupcao.signal,
          progresso: (message) => console.log(message),
        });
        if (queueError)
          throw new BenchFilaError("erro na fila durante a rodada.");
        rodadas.push(resultado);
        await checkpoint("em_execucao", { bancoInfo, pgBossVersion });
        console.log(
          `Rodada concluida: W=${workers}; rodada=${rodada}; ${resultado.duracaoMs.toFixed(2)}ms; duplicadas=${resultado.duplicadas}; tentativas=${resultado.tentativasMin}-${resultado.tentativasMax}.`,
        );
      }
    }
    const resumo = resumirRodadas(rodadas);
    await checkpoint("concluido", { bancoInfo, pgBossVersion, resumo });
    await executarPython(python, [
      fileURLToPath(new URL("grafico-fila.py", import.meta.url)),
      resolve(pasta, "rodadas.csv"),
      resolve(pasta, "throughput.png"),
    ]);
    console.table(
      resumo.map((r) => ({
        W: r.workers,
        rodadas: r.rodadas,
        mediana_s: (r.medianaMs / 1000).toFixed(3),
        jobs_s: r.throughput.toFixed(3),
        speedup: r.speedup.toFixed(3),
        eficiencia: r.eficiencia.toFixed(3),
      })),
    );
    concluido = true;
    console.log(`Evidencias: ${pasta}`);
  } catch (error) {
    await checkpoint("falha", {
      erro:
        error instanceof BenchFilaError
          ? error.message
          : "Falha operacional; dados secretos omitidos.",
    });
    throw error;
  } finally {
    const recursos = await Promise.allSettled([
      boss.stop({ graceful: true }),
      prisma.$disconnect(),
    ]);
    try {
      if (locked) await removerFila(pool, schema, pasta, concluido);
    } finally {
      if (locked)
        await lock?.query(
          "SELECT pg_advisory_unlock(hashtext('origem:bench-fila:30.5'))",
        );
      lock?.release();
      await pool.end();
      process.off("SIGINT", interromper);
      process.off("SIGTERM", interromper);
    }
    if (recursos.some((recurso) => recurso.status === "rejected"))
      process.exitCode = 1;
  }
}

const executedFile = process.argv[1];
if (
  executedFile !== undefined &&
  import.meta.url === pathToFileURL(executedFile).href
) {
  main(process.argv.slice(2), process.env).catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof BenchFilaError ? error.message : "Benchmark da fila falhou; detalhes internos omitidos."}\n`,
    );
    process.exitCode = 1;
  });
}

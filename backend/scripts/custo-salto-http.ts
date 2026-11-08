import "dotenv/config";
import { fork, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { cpus, platform, release } from "node:os";
import { dirname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { Pool } from "pg";
import { z } from "zod";
import { resumirBusca, validarBuscaEnvironment } from "./busca-p95.js";

const BASELINE = "df92c704a3cd3bcb6800b103d4ddcafb596e2b09";
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const respostaSchema = z.object({
  estrategia: z.enum(["categoria", "fallback-geral"]),
  itens: z
    .array(z.object({ id: z.uuid() }))
    .min(1)
    .max(8),
});

export interface AmostraSalto {
  configuracao: "A" | "B";
  fase: "aquecimento" | "medicao";
  tentativa: number;
  produtoId: string;
  tempoMs: number;
  statusHttp: number;
  cache: string;
  estrategia: string;
  assinatura: string;
  valida: boolean;
}

export function resumirSalto(tempos: number[]) {
  const { amostras, p50Ms, p95Ms, maxMs } = resumirBusca(tempos);
  return { amostras, p50Ms, p95Ms, maxMs };
}

export function validarVolume(env: NodeJS.ProcessEnv): string {
  return validarBuscaEnvironment(
    {
      volumeEnv: "DATABASE_URL_VOLUME",
      schema: "public",
      termo: "vaso",
      output: ".",
    },
    env,
  );
}

export async function medirConfiguracao(options: {
  base: string;
  configuracao: "A" | "B";
  produtoIds: string[];
  invalidar: () => Promise<void>;
  registrar: (amostra: AmostraSalto) => Promise<void>;
}): Promise<AmostraSalto[]> {
  const ids = z.array(z.uuid()).length(10).parse(options.produtoIds);
  if (new Set(ids).size !== 10)
    throw new Error("Dez contextos distintos exigidos");
  const base = new URL(options.base);
  if (base.protocol !== "http:" || base.hostname !== "127.0.0.1")
    throw new Error("Benchmark exige HTTP local");
  const amostras: AmostraSalto[] = [];
  const referencias = new Map<string, string>();
  for (const fase of ["aquecimento", "medicao"] as const) {
    const total = fase === "aquecimento" ? 5 : 30;
    for (let i = 0; i < total; i += 1) {
      await options.invalidar();
      const produtoId = ids[i % 10];
      if (!produtoId) throw new Error("Contexto ausente");
      const amostra: AmostraSalto = {
        configuracao: options.configuracao,
        fase,
        tentativa: i + 1,
        produtoId,
        tempoMs: 0,
        statusHttp: 0,
        cache: "ausente",
        estrategia: "invalida",
        assinatura: "",
        valida: false,
      };
      const inicio = performance.now();
      let falhou = false;
      try {
        const url = new URL("/recomendacoes", base);
        url.searchParams.set("produtoId", produtoId);
        const response = await fetch(url, {
          signal: AbortSignal.timeout(30_000),
          redirect: "error",
        });
        amostra.statusHttp = response.status;
        amostra.cache = response.headers.get("x-cache") ?? "ausente";
        const body: unknown = await response.json();
        amostra.tempoMs = performance.now() - inicio;
        if (
          response.status !== 200 ||
          amostra.cache !== "MISS" ||
          response.headers.get("cache-control") !== "no-store"
        )
          throw new Error("Resposta HTTP ou cache inesperado");
        const resposta = respostaSchema.parse(body);
        amostra.estrategia = resposta.estrategia;
        const itemIds = resposta.itens.map(({ id }) => id);
        if (new Set(itemIds).size !== itemIds.length)
          throw new Error("Recomendacoes repetidas");
        amostra.assinatura = createHash("sha256")
          .update(JSON.stringify(body))
          .digest("hex");
        const anterior = referencias.get(produtoId);
        if (anterior && anterior !== amostra.assinatura)
          throw new Error("Resposta mudou durante a medicao");
        referencias.set(produtoId, amostra.assinatura);
        amostra.valida = true;
      } catch {
        if (amostra.tempoMs === 0) amostra.tempoMs = performance.now() - inicio;
        falhou = true;
      }
      await options.registrar(amostra);
      amostras.push(amostra);
      if (falhou)
        throw new Error(
          `Tentativa invalida: ${options.configuracao}/${fase}/${i + 1}`,
        );
    }
  }
  return amostras;
}

function git(root: string, ...args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
  }).trim();
}

function iniciarProcesso(
  tipo: "api" | "servico",
  root: string,
  env: NodeJS.ProcessEnv,
) {
  const child = fork(
    fileURLToPath(new URL("helpers/custo-salto-worker.ts", import.meta.url)),
    [tipo, root],
    {
      execArgv: ["--import", import.meta.resolve("tsx")],
      env,
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    },
  );
  const pendentes = new Set<(error: Error) => void>();
  let chamadas = 0;
  let encerrado = false;
  child.on("message", (message: unknown) => {
    if (z.object({ evento: z.literal("chamada") }).safeParse(message).success)
      chamadas += 1;
  });
  child.once("exit", () => {
    encerrado = true;
    for (const rejeitar of pendentes) rejeitar(new Error("Processo encerrado"));
  });
  const aguardar = (evento: string) =>
    new Promise<number>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        pendentes.delete(falhar);
        child.off("message", receber);
      };
      const falhar = (error: Error) => {
        cleanup();
        reject(error);
      };
      const receber = (value: unknown) => {
        const parsed = z
          .object({ evento: z.string(), porta: z.number().optional() })
          .safeParse(value);
        if (!parsed.success) return;
        if (parsed.data.evento === "falha")
          falhar(new Error("Falha no processo de medicao"));
        if (parsed.data.evento === evento) {
          cleanup();
          resolve(parsed.data.porta ?? 0);
        }
      };
      const timer = setTimeout(
        () => falhar(new Error("Processo sem resposta")),
        45_000,
      );
      pendentes.add(falhar);
      child.on("message", receber);
      if (encerrado) falhar(new Error("Processo encerrado"));
    });
  child.once("error", () => {
    for (const rejeitar of pendentes)
      rejeitar(new Error("Falha ao iniciar processo"));
  });
  return {
    pid: child.pid,
    pronto: aguardar("pronto"),
    chamadas: () => chamadas,
    invalidar: async () => {
      const resposta = aguardar("invalidado");
      child.send({ evento: "invalidar" });
      await resposta;
    },
    parar: async () => {
      if (encerrado) return;
      await new Promise<void>((done) => {
        const timer = setTimeout(() => child.kill(), 5000);
        child.once("exit", () => {
          clearTimeout(timer);
          done();
        });
        child.send({ evento: "parar" });
      });
    },
  };
}

async function contexto(pool: Pool) {
  const tabelas = [
    "Produto",
    "ProdutoFoto",
    "Usuario",
    "PerfilArtesao",
    "ItemPedido",
    "Pedido",
    "Avaliacao",
  ];
  const dados = [];
  for (const tabela of tabelas) {
    const result = await pool.query<{ total: number; hash: string }>(
      `SELECT count(*)::int AS total, md5(string_agg(md5(row_to_json(t)::text), '' ORDER BY md5(row_to_json(t)::text))) AS hash FROM public."${tabela}" t`,
    );
    dados.push({ tabela, ...result.rows[0] });
  }
  return dados;
}

export async function executarSalto(baseline: string, output: string) {
  const connectionString = validarVolume(process.env);
  if (
    git(baseline, "rev-parse", "HEAD") !== BASELINE ||
    git(baseline, "diff", "HEAD", "--", "backend") ||
    !git(baseline, "rev-parse", "--git-dir").includes("worktrees")
  )
    throw new Error("A exige worktree historico limpo");
  const hashAtual = git(ROOT, "rev-parse", "HEAD");
  if (
    git(ROOT, "diff", "HEAD", "--", "backend/src", "services/recomendacao/src")
  )
    throw new Error("B exige fontes da aplicacao iguais ao HEAD");
  await mkdir(dirname(output), { recursive: true });
  await mkdir(output);
  const csv = join(output, "bruto.csv");
  const colunas: (keyof AmostraSalto)[] = [
    "configuracao",
    "fase",
    "tentativa",
    "produtoId",
    "tempoMs",
    "statusHttp",
    "cache",
    "estrategia",
    "assinatura",
    "valida",
  ];
  await writeFile(csv, colunas.join(",") + "\n", { flag: "wx" });
  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 0,
  });
  const processos: ReturnType<typeof iniciarProcesso>[] = [];
  const amostras: AmostraSalto[] = [];
  let etapa = "contexto-inicial";
  try {
    await pool.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await pool.query("SET LOCAL statement_timeout = '30s'");
    const snapshot = (
      await pool.query<{ snapshot: string }>(
        "SELECT pg_export_snapshot() AS snapshot",
      )
    ).rows[0]?.snapshot;
    if (!snapshot) throw new Error("Snapshot ausente");
    const antes = await contexto(pool);
    if ((antes[0]?.total ?? 0) < 1000)
      throw new Error("Volume requer mil produtos");
    const produtoIds = (
      await pool.query<{ id: string }>(
        "SELECT id FROM public.rec_produtos_elegiveis WHERE visivel ORDER BY id LIMIT 10",
      )
    ).rows.map(({ id }) => id);
    const token = createHash("sha256")
      .update(crypto.randomUUID())
      .digest("hex");
    const env = {
      ...process.env,
      NODE_ENV: "development",
      SALTO_DATABASE_URL: connectionString,
      SALTO_SNAPSHOT: snapshot,
      RECOMENDACAO_SERVICE_TOKEN: token,
    };
    const servico = iniciarProcesso("servico", ROOT, env);
    processos.push(servico);
    etapa = "iniciar-microsservico";
    const portaServico = await servico.pronto;
    const apiEnv = {
      ...env,
      RECOMENDACAO_URL: `http://127.0.0.1:${portaServico}`,
    };
    for (const configuracao of ["A", "B"] as const) {
      etapa = `iniciar-${configuracao}`;
      const api = iniciarProcesso(
        "api",
        configuracao === "A" ? baseline : ROOT,
        apiEnv,
      );
      processos.push(api);
      const porta = await api.pronto;
      etapa = `medir-${configuracao}`;
      await medirConfiguracao({
        base: `http://127.0.0.1:${porta}`,
        configuracao,
        produtoIds,
        invalidar: api.invalidar,
        registrar: async (amostra) => {
          await appendFile(
            csv,
            colunas.map((key) => amostra[key]).join(",") + "\n",
          );
          amostras.push(amostra);
        },
      });
      await api.parar();
    }
    etapa = "conferir-resultados";
    if (servico.chamadas() !== 35)
      throw new Error("B exige 35 chamadas internas reais");
    const depois = await contexto(pool);
    if (JSON.stringify(antes) !== JSON.stringify(depois))
      throw new Error("Banco mudou durante A/B");
    for (const produtoId of produtoIds) {
      if (
        new Set(
          amostras
            .filter((a) => a.produtoId === produtoId)
            .map((a) => a.assinatura),
        ).size !== 1
      )
        throw new Error("Respostas de A/B divergiram");
    }
    const resumo = (configuracao: "A" | "B") =>
      resumirSalto(
        amostras
          .filter(
            (a) => a.configuracao === configuracao && a.fase === "medicao",
          )
          .map((a) => a.tempoMs),
      );
    const A = resumo("A");
    const B = resumo("B");
    const diferenca = {
      p50Ms: B.p50Ms - A.p50Ms,
      p95Ms: B.p95Ms - A.p95Ms,
      maxMs: B.maxMs - A.maxMs,
    };
    const resultado = {
      capturadoEm: new Date().toISOString(),
      commits: { A: BASELINE, B: hashAtual },
      ambiente: {
        node: process.version,
        sistema: `${platform()} ${release()}`,
        cpu: cpus()[0]?.model,
        processos: processos.map((p) => p.pid),
        banco: "DATABASE_URL_VOLUME",
        dados: antes,
        somenteLeitura: true,
        poolPorProcesso: 1,
        timeoutInternoMs: 800,
        conexoes:
          "Mesmo papel da fixture de volume, transacoes read-only; servico consulta somente views",
      },
      metodologia: {
        aquecimentos: 5,
        medicoes: 30,
        produtos: produtoIds,
        ciclos: 3,
        ordem:
          "A depois B; requisicoes sequenciais; processos separados na mesma maquina",
        cache:
          "CACHE_TTL_SECONDS=1; invalidacao de recomendacoes: por IPC antes de cada request; X-Cache=MISS obrigatorio; microsservico sem cache",
        tempo:
          "performance.now antes do fetch ate decodificar todo JSON; invalidacao e validacao fora da cronometragem",
        percentil: "nearest-rank: p50=15o, p95=29o, max=30o",
        descarte:
          "Somente 5 aquecimentos por configuracao, todos no CSV; falhas encerram sem retry ou reposicao",
        chamadasInternasB: servico.chamadas(),
        respostasIdenticas: true,
        snapshotCompartilhado: snapshot,
        snapshotInalterado: true,
      },
      A,
      B,
      diferenca,
    };
    await writeFile(
      join(output, "resultado.json"),
      JSON.stringify(resultado, null, 2) + "\n",
      { flag: "wx" },
    );
    const linha = (nome: string, r: typeof diferenca) =>
      `| ${nome} | ${r.p50Ms.toFixed(3)} | ${r.p95Ms.toFixed(3)} | ${r.maxMs.toFixed(3)} |`;
    await writeFile(
      join(output, "tabela.md"),
      [
        "# 35.8: custo do salto HTTP",
        "",
        "| Configuracao | p50 ms | p95 ms | Maximo ms |",
        "| --- | ---: | ---: | ---: |",
        linha("A: in-process", A),
        linha("B: API + microsservico", B),
        linha("Diferenca B - A", diferenca),
        "",
        `A: \`${BASELINE}\`. B: \`${hashAtual}\`.`,
        "",
        "Trinta medicoes validas por configuracao, apos cinco aquecimentos.",
        "Dez produtos identicos, tres ciclos; percentis por nearest-rank.",
        "O CSV preserva aquecimentos; nenhuma medicao foi descartada.",
        "",
        "O salto HTTP adiciona latencia de rede e serializacao.",
        "O ganho da separacao esta no isolamento de falha,",
        "no deploy independente e na escala do lote.",
        "A separacao nao tem como objetivo reduzir latencia individual.",
        "",
        "A diferenca observada compara duas implementacoes historicas completas.",
        "Ela inclui consultas Prisma versus views SQL e observabilidade.",
        "Nao representa uma estimativa isolada do transporte HTTP.",
        "Variabilidade do Neon e ordem A/B tambem influenciam resultados.",
        "Caches do PostgreSQL e sistema operacional permanecem ativos.",
        "As chamadas sao locais; o banco de volume e remoto.",
        "Esta medicao nao comprova isolamento, deploy ou escalabilidade.",
        "",
        "Metodologia, ambiente e hashes dos dados: resultado.json.",
        "",
      ].join("\n"),
      { flag: "wx" },
    );
    return resultado;
  } catch {
    await writeFile(
      join(output, "falha.json"),
      JSON.stringify(
        {
          estado: "incompleto",
          etapa,
          tentativasRegistradas: amostras.length,
          motivo:
            "Execucao interrompida; consulte CSV; nenhuma reposicao ou retry",
        },
        null,
        2,
      ),
      { flag: "wx" },
    );
    throw new Error("Benchmark incompleto; CSV preservado");
  } finally {
    await Promise.allSettled(processos.map((p) => p.parar()));
    try {
      await pool.query("ROLLBACK");
    } finally {
      await pool.end();
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  Promise.resolve()
    .then(async () => {
      const { values } = parseArgs({
        options: { baseline: { type: "string" }, output: { type: "string" } },
        allowPositionals: false,
      });
      const baseline = z.string().min(1).parse(values.baseline);
      const output = resolve(
        values.output ??
          join(
            ROOT,
            "evidencias/PI4-35/35.8-custo-http",
            new Date().toISOString().replaceAll(/[:.]/g, "-"),
          ),
      );
      const resultado = await executarSalto(resolve(baseline), output);
      console.table({
        A: resultado.A,
        B: resultado.B,
        "B - A": resultado.diferenca,
      });
      console.log(`Evidencias: ${output}`);
    })
    .catch((error: unknown) => {
      process.stderr.write(
        error instanceof Error &&
          error.message === "Benchmark incompleto; CSV preservado"
          ? `${error.message}\n`
          : "Benchmark recusado: confira worktree, volume e argumentos.\n",
      );
      process.exitCode = 1;
    });
}

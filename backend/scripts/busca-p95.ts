import "dotenv/config";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import type { Server } from "node:http";
import { resolve, join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import { createApp } from "../src/app.js";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { MemoryCacheStore } from "../src/utils/cache.js";
import { searchPattern } from "./db-explain.js";

const AQUECIMENTOS = 5;
const MEDICOES = 30;
const optionsSchema = z
  .object({
    volumeEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    schema: z.string().regex(/^[a-z][a-z0-9_]{0,62}$/),
    termo: z.string().trim().min(3).max(120),
    output: z.string().min(1),
  })
  .strict();
export type BuscaOptions = z.infer<typeof optionsSchema>;

interface Consulta {
  sql: string;
  parametros: unknown[];
}
interface CapturaSQL {
  ativa: boolean;
  consultas: Consulta[];
}
interface Plano {
  Plan: { "Actual Rows": number; [key: string]: unknown };
  "Planning Time": number;
  "Execution Time": number;
}
interface Cenario {
  nome: string;
  filtros: Record<string, string>;
}
interface Amostra {
  cenario: string;
  fase: "aquecimento" | "medicao";
  repeticao: number;
  tempoMs: number;
  statusHttp: number;
  cache: "MISS";
  itens: number;
}

const produtoSchema = z.object({
  id: z.uuid(),
  nome: z.string(),
  descricao: z.string(),
  categoriaId: z.uuid(),
  tecnicaId: z.string(),
  regiaoId: z.string(),
  ativo: z.literal(true),
  desativadoPorAdmin: z.literal(false),
  quantidadeEstoque: z.number().int().positive(),
});
const respostaSchema = z.array(produtoSchema).min(1).max(24);

export function parseBuscaOptions(args: string[]): BuscaOptions {
  const { values } = parseArgs({
    args,
    allowPositionals: false,
    options: {
      "volume-env": { type: "string" },
      schema: { type: "string" },
      termo: { type: "string" },
      output: { type: "string" },
    },
  });
  return optionsSchema.parse({
    volumeEnv: values["volume-env"] ?? "DATABASE_URL_VOLUME",
    schema: values.schema ?? "public",
    termo: values.termo ?? "vaso",
    output: resolve(
      values.output ??
        `../evidencias/PI4-BD-W12-Indices-Consultas/BD.2-busca-p95/${new Date().toISOString().replaceAll(/[:.]/g, "-")}`,
    ),
  });
}

function identidade(value: string): string {
  const url = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    url.pathname.length < 2
  )
    throw new Error("URL PostgreSQL invalida");
  return `${url.hostname.replace(/-pooler(?=\.)/, "")}:${url.port || "5432"}${url.pathname}`;
}

export function validarBuscaEnvironment(
  options: BuscaOptions,
  env: NodeJS.ProcessEnv,
): string {
  optionsSchema.parse(options);
  const value = env[options.volumeEnv];
  if (!value || env.NODE_ENV === "production")
    throw new Error("Benchmark requer conexao de volume fora de producao");
  const base = identidade(value);
  if (env.DATABASE_URL_DEPLOY && identidade(env.DATABASE_URL_DEPLOY) === base)
    throw new Error("Benchmark proibido na base de deploy");
  if (
    env.DATABASE_URL &&
    identidade(env.DATABASE_URL) === base &&
    options.schema === "public"
  )
    throw new Error("Volume exige base ou schema separado");
  return value;
}

export function resumirBusca(tempos: number[]) {
  if (
    tempos.length !== MEDICOES ||
    tempos.some((tempo) => !Number.isFinite(tempo) || tempo < 0)
  )
    throw new Error("Medicao requer trinta tempos validos");
  const ordenados = [...tempos].sort((a, b) => a - b);
  const p50Ms = ordenados[Math.ceil(MEDICOES * 0.5) - 1];
  const p95Ms = ordenados[Math.ceil(MEDICOES * 0.95) - 1];
  const maxMs = ordenados[MEDICOES - 1];
  if (p50Ms === undefined || p95Ms === undefined || maxMs === undefined)
    throw new Error("Amostras ausentes");
  return { amostras: MEDICOES, p50Ms, p95Ms, maxMs, aprovado: p95Ms < 500 };
}

async function criarCenarios(
  prisma: PrismaClient,
  termo: string,
): Promise<Cenario[]> {
  const padrao = searchPattern(termo);
  const rows = await prisma.$queryRaw<
    { categoriaId: string; tecnicaId: string; regiaoId: string }[]
  >`
    SELECT p."categoriaId", p."tecnicaId", pa."regiaoId"
    FROM "Produto" p
    JOIN "Usuario" u ON u.id = p."artesaoId" AND u.ativo AND u.papel = 'artesao'
    JOIN "PerfilArtesao" pa ON pa."usuarioId" = p."artesaoId"
    WHERE p.ativo AND NOT p."desativadoPorAdmin" AND p."quantidadeEstoque" > 0
      AND pa."regiaoId" IS NOT NULL
      AND (p.nome ILIKE ${padrao} OR p.descricao ILIKE ${padrao})
    GROUP BY p."categoriaId", p."tecnicaId", pa."regiaoId"
    ORDER BY count(*) DESC, p."categoriaId", p."tecnicaId", pa."regiaoId"
    LIMIT 1`;
  const referencia = rows[0];
  if (!referencia) throw new Error("Termo sem produtos visiveis com regiao");
  return [
    { nome: "sem-filtro", filtros: {} },
    { nome: "termo", filtros: { termo } },
    { nome: "categoria", filtros: { categoriaId: referencia.categoriaId } },
    { nome: "tecnica", filtros: { tecnicaId: referencia.tecnicaId } },
    { nome: "regiao", filtros: { regiaoId: referencia.regiaoId } },
    {
      nome: "combinado",
      filtros: {
        termo,
        categoriaId: referencia.categoriaId,
        regiaoId: referencia.regiaoId,
      },
    },
  ];
}

async function medirChamada(
  base: string,
  cenario: Cenario,
  cache: MemoryCacheStore,
) {
  await cache.invalidarPorPrefixo("produtos:");
  const query = new URLSearchParams({
    limit: "24",
    offset: "0",
    ...cenario.filtros,
  });
  const inicio = performance.now();
  const response = await fetch(`${base}/produtos?${query}`, {
    signal: AbortSignal.timeout(30_000),
  });
  const body: unknown = await response.json();
  const tempoMs = performance.now() - inicio;
  if (
    response.status !== 200 ||
    response.headers.get("x-cache") !== "MISS" ||
    response.headers.get("cache-control") !== "no-store"
  )
    throw new Error("Resposta HTTP ou cache inesperado");
  const produtos = respostaSchema.parse(body);
  const ids = new Set(produtos.map((produto) => produto.id));
  if (ids.size !== produtos.length)
    throw new Error("Produtos repetidos na resposta");
  for (const produto of produtos) {
    for (const campo of ["categoriaId", "tecnicaId", "regiaoId"] as const) {
      if (
        cenario.filtros[campo] !== undefined &&
        produto[campo] !== cenario.filtros[campo]
      )
        throw new Error("Filtro HTTP nao respeitado");
    }
    const termo = cenario.filtros.termo?.toLowerCase();
    if (
      termo &&
      !produto.nome.toLowerCase().includes(termo) &&
      !produto.descricao.toLowerCase().includes(termo)
    )
      throw new Error("Termo HTTP nao respeitado");
  }
  return {
    tempoMs,
    statusHttp: response.status,
    cache: "MISS" as const,
    itens: produtos.length,
    resposta: JSON.stringify(body),
  };
}

function iniciarHttp(
  prisma: PrismaClient,
  cacheStore: MemoryCacheStore,
): Promise<Server> {
  const app = createApp(
    prisma,
    { JWT_SECRET: undefined, COOKIE_SECURE: false },
    { cacheStore, logCache: () => {} },
  );
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
    server.once("error", reject);
  });
}

async function medirCenarioHttp(
  base: string,
  cenario: Cenario,
  cache: MemoryCacheStore,
  captura: CapturaSQL,
): Promise<Amostra[]> {
  const amostras: Amostra[] = [];
  let referencia: string | undefined;
  captura.consultas = [];
  for (const fase of ["aquecimento", "medicao"] as const) {
    const total = fase === "aquecimento" ? AQUECIMENTOS : MEDICOES;
    for (let repeticao = 1; repeticao <= total; repeticao += 1) {
      captura.ativa = fase === "aquecimento" && repeticao === 1;
      try {
        const { resposta, ...amostra } = await medirChamada(
          base,
          cenario,
          cache,
        );
        referencia ??= resposta;
        if (resposta !== referencia)
          throw new Error("Resposta mudou durante o snapshot");
        amostras.push({ cenario: cenario.nome, fase, repeticao, ...amostra });
      } finally {
        captura.ativa = false;
      }
    }
  }
  return amostras;
}

async function explicarConsultas(pool: Pool, consultas: Consulta[]) {
  if (consultas.length === 0) throw new Error("Consulta HTTP nao capturada");
  const planos = [];
  for (const consulta of consultas) {
    const result = await pool.query<{ "QUERY PLAN": Plano[] }>(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${consulta.sql}`,
      consulta.parametros,
    );
    const explain = result.rows[0]?.["QUERY PLAN"];
    if (!explain?.[0]) throw new Error("Plano HTTP ausente");
    planos.push({ ...consulta, explain });
  }
  return planos;
}

export async function executarBuscaBenchmark(
  options: BuscaOptions,
  env: NodeJS.ProcessEnv = process.env,
) {
  const connectionString = validarBuscaEnvironment(options, env);
  await mkdir(options.output, { recursive: true });
  if ((await readdir(options.output)).length > 0)
    throw new Error("Diretorio de saida precisa estar vazio");
  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 0,
  });
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool, { schema: options.schema }),
    log: [{ level: "query", emit: "event" }],
  });
  const captura: CapturaSQL = { ativa: false, consultas: [] };
  prisma.$on("query", (event) => {
    if (captura.ativa)
      captura.consultas.push({
        sql: event.query,
        parametros: z.array(z.unknown()).parse(JSON.parse(event.params)),
      });
  });
  let transacao = false;
  let server: Server | undefined;
  try {
    const client = await pool.connect();
    let snapshot: {
      pid: number;
      produtos: number;
      enableSeqscan: string;
      version: string;
    };
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      transacao = true;
      const existe = await client.query(
        "SELECT 1 FROM information_schema.schemata WHERE schema_name = $1",
        [options.schema],
      );
      if (existe.rowCount !== 1) throw new Error("Schema inexistente");
      await client.query(`SET LOCAL search_path TO "${options.schema}"`);
      await client.query("SET LOCAL statement_timeout = '60s'");
      await client.query("SET LOCAL lock_timeout = '5s'");
      const row = (
        await client.query<{
          pid: number;
          produtos: number;
          enableSeqscan: string;
          version: string;
        }>(
          `SELECT pg_backend_pid() AS pid, (SELECT count(*)::int FROM "Produto") AS produtos, current_setting('enable_seqscan') AS "enableSeqscan", version()`,
        )
      ).rows[0];
      if (!row || row.produtos < 1000)
        throw new Error("Benchmark requer pelo menos 1000 produtos");
      if (row.enableSeqscan !== "on")
        throw new Error("Benchmark requer planner sem desativar Seq Scan");
      snapshot = row;
    } finally {
      client.release();
    }
    const cenarios = await criarCenarios(prisma, options.termo);
    const cacheStore = new MemoryCacheStore();
    server = await iniciarHttp(prisma, cacheStore);
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Endereco HTTP ausente");
    const base = `http://127.0.0.1:${address.port}`;
    const amostras: Amostra[] = [];
    const planos: {
      cenario: string;
      filtros: Record<string, string>;
      consultas: { sql: string; parametros: unknown[]; explain: Plano[] }[];
    }[] = [];
    for (const cenario of cenarios) {
      amostras.push(
        ...(await medirCenarioHttp(base, cenario, cacheStore, captura)),
      );
      planos.push({
        cenario: cenario.nome,
        filtros: cenario.filtros,
        consultas: await explicarConsultas(pool, captura.consultas),
      });
    }
    const final = (
      await pool.query<{ pid: number; readonly: string; isolamento: string }>(
        "SELECT pg_backend_pid() AS pid, current_setting('transaction_read_only') AS readonly, current_setting('transaction_isolation') AS isolamento",
      )
    ).rows[0];
    if (
      !final ||
      final.pid !== snapshot.pid ||
      final.readonly !== "on" ||
      final.isolamento !== "repeatable read"
    )
      throw new Error("Snapshot de medicao foi substituido");
    const resultados = cenarios.map((cenario) => ({
      cenario: cenario.nome,
      filtros: cenario.filtros,
      ...resumirBusca(
        amostras
          .filter(
            (amostra) =>
              amostra.cenario === cenario.nome && amostra.fase === "medicao",
          )
          .map((amostra) => amostra.tempoMs),
      ),
    }));
    const resultado = {
      capturadoEm: new Date().toISOString(),
      contexto: {
        produtos: snapshot.produtos,
        schema: options.schema,
        variavelVolume: options.volumeEnv,
        somenteLeitura: true,
        enableSeqscan: snapshot.enableSeqscan,
        postgres: snapshot.version,
        node: process.version,
        pool: 1,
      },
      metodologia: {
        aquecimentosPorCenario: AQUECIMENTOS,
        medicoesPorCenario: MEDICOES,
        percentil: "nearest-rank",
        limiteP95Ms: 500,
        cache:
          "produtos: invalidado antes de cada requisicao; X-Cache=MISS obrigatorio",
        tempo:
          "HTTP ate receber e decodificar todo o JSON; invalidacao e validacao fora da cronometragem",
        snapshot: "REPEATABLE READ READ ONLY",
        ordem: "sequencial",
        observacao:
          "Nao esvazia caches PostgreSQL ou sistema operacional. Consultas Prisma sao capturadas para EXPLAIN.",
      },
      aprovado: resultados.every((cenario) => cenario.aprovado),
      cenarios: resultados,
    };
    const csv =
      [
        "cenario,fase,repeticao,tempo_ms,status_http,cache,itens",
        ...amostras.map((amostra) =>
          [
            amostra.cenario,
            amostra.fase,
            amostra.repeticao,
            amostra.tempoMs.toFixed(6),
            amostra.statusHttp,
            amostra.cache,
            amostra.itens,
          ].join(","),
        ),
      ].join("\n") + "\n";
    const resumo = [
      "# BD.2: benchmark HTTP da busca",
      "",
      "Cinco aquecimentos descartados e trinta medicoes por cenario.",
      "Todos os requests exigem HTTP 200, X-Cache MISS e resultados nao vazios.",
      "CSV inclui aquecimentos identificados; percentis usam somente medicoes.",
      "P50 e p95 usam nearest-rank; nenhum outlier de medicao e descartado.",
      "",
      "| Cenario | Medicoes | p50 ms | p95 ms | Max ms | Aprovado |",
      "| --- | ---: | ---: | ---: | ---: | --- |",
      ...resultados.map(
        (cenario) =>
          `| ${cenario.cenario} | ${cenario.amostras} | ${cenario.p50Ms.toFixed(3)} | ${cenario.p95Ms.toFixed(3)} | ${cenario.maxMs.toFixed(3)} | ${cenario.aprovado ? "Sim" : "Nao"} |`,
      ),
      "",
      "Os planos usam as consultas SQL efetivamente executadas pelo HTTP.",
      "Nenhum seed, migration, ANALYZE ou indice e aplicado pelo benchmark.",
      "",
    ].join("\n");
    await writeFile(join(options.output, "bruto.csv"), csv, { flag: "wx" });
    await writeFile(
      join(options.output, "resultado.json"),
      JSON.stringify(resultado, null, 2) + "\n",
      { flag: "wx" },
    );
    await writeFile(join(options.output, "resumo.md"), resumo, { flag: "wx" });
    await mkdir(join(options.output, "explain-http"));
    for (const plano of planos)
      await writeFile(
        join(options.output, "explain-http", `${plano.cenario}.json`),
        JSON.stringify(plano, null, 2) + "\n",
        { flag: "wx" },
      );
    return resultado;
  } finally {
    captura.ativa = false;
    try {
      if (server)
        await new Promise<void>((resolve, reject) =>
          server?.close((error) => (error ? reject(error) : resolve())),
        );
    } finally {
      try {
        if (transacao) await pool.query("ROLLBACK");
      } finally {
        try {
          await prisma.$disconnect();
        } finally {
          await pool.end();
        }
      }
    }
  }
}

const executedFile = process.argv[1];
if (
  executedFile !== undefined &&
  import.meta.url === pathToFileURL(executedFile).href
) {
  Promise.resolve()
    .then(() => parseBuscaOptions(process.argv.slice(2)))
    .then(async (options) => {
      const resultado = await executarBuscaBenchmark(options);
      console.table(
        resultado.cenarios.map(
          ({ cenario, p50Ms, p95Ms, maxMs, aprovado }) => ({
            cenario,
            p50Ms: p50Ms.toFixed(3),
            p95Ms: p95Ms.toFixed(3),
            maxMs: maxMs.toFixed(3),
            aprovado,
          }),
        ),
      );
      console.log(`Benchmark salvo em ${options.output}`);
      if (!resultado.aprovado) process.exitCode = 1;
    })
    .catch(() => {
      process.stderr.write(
        "bench:busca recusado ou falhou. Confira argumentos, ambiente e banco.\n",
      );
      process.exitCode = 1;
    });
}

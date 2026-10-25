import "dotenv/config";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { runSeed } from "../prisma/seed.js";
import { runVolumeSeed } from "../prisma/seed-volume.js";
import {
  formatarTabelaMetricas,
  medirBaseRecomendacao,
  medirReforcoRegional,
  type ResultadoBase,
} from "./lib/recomendacao-benchmark.js";

const optionsSchema = z
  .object({
    isolado: z.boolean(),
    demoEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    volumeEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    schemaDemo: z.string().regex(/^[a-z][a-z0-9_]{0,62}$/),
    schemaVolume: z.string().regex(/^[a-z][a-z0-9_]{0,62}$/),
    repeticoes: z.coerce.number().int().min(1).max(10),
    output: z.string().min(1),
    reforcoRegional: z.enum(["on", "off", "ambos"]),
  })
  .strict();

export type MetricsOptions = z.infer<typeof optionsSchema>;

class MetricsConfigurationError extends Error {}

export function parseMetricsOptions(args: string[]): MetricsOptions {
  try {
    const { values } = parseArgs({
      args,
      allowPositionals: false,
      options: {
        isolado: { type: "boolean" },
        "demo-env": { type: "string" },
        "volume-env": { type: "string" },
        "schema-demo": { type: "string" },
        "schema-volume": { type: "string" },
        repeticoes: { type: "string" },
        output: { type: "string" },
        "reforco-regional": { type: "string" },
      },
    });
    if (
      values.isolado &&
      [
        values["demo-env"],
        values["volume-env"],
        values["schema-demo"],
        values["schema-volume"],
      ].some((v) => v !== undefined)
    )
      throw new Error();
    return optionsSchema.parse({
      isolado: values.isolado ?? false,
      demoEnv: values["demo-env"] ?? "DATABASE_URL",
      volumeEnv: values["volume-env"] ?? "DATABASE_URL_VOLUME",
      schemaDemo: values["schema-demo"] ?? "public",
      schemaVolume: values["schema-volume"] ?? "public",
      repeticoes: values.repeticoes ?? "1",
      reforcoRegional: values["reforco-regional"] ?? "ambos",
      output: resolve(
        values.output ??
          fileURLToPath(
            new URL("../metricas/recomendacao-volume.json", import.meta.url),
          ),
      ),
    });
  } catch {
    throw new MetricsConfigurationError("Argumentos de metricas invalidos.");
  }
}

function conexao(env: NodeJS.ProcessEnv, nome: string) {
  const value = env[nome];
  try {
    if (!value) throw new Error();
    const url = new URL(value);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname ||
      url.pathname.length < 2
    )
      throw new Error();
    return {
      value,
      identity: `${url.hostname.replace(/-pooler(?=\.)/, "")}:${url.port || "5432"}${url.pathname}`,
    };
  } catch {
    throw new MetricsConfigurationError(
      `Variavel ausente ou invalida: ${nome}`,
    );
  }
}

export function validarMetricsEnvironment(
  options: MetricsOptions,
  env: NodeJS.ProcessEnv,
) {
  optionsSchema.parse(options);
  if (options.isolado) {
    const direct = conexao(env, "DIRECT_URL");
    if (env.NODE_ENV === "production")
      throw new MetricsConfigurationError(
        "Schemas isolados proibidos em producao.",
      );
    if (
      env.DATABASE_URL_DEPLOY &&
      conexao(env, "DATABASE_URL_DEPLOY").identity === direct.identity
    )
      throw new MetricsConfigurationError(
        "Schemas isolados proibidos na base de deploy.",
      );
    return { demo: direct.value, volume: direct.value };
  }
  const demo = conexao(env, options.demoEnv);
  const volume = conexao(env, options.volumeEnv);
  if (
    demo.identity === volume.identity &&
    options.schemaDemo === options.schemaVolume
  )
    throw new MetricsConfigurationError(
      "Demo e volume precisam de bases ou schemas distintos.",
    );
  return { demo: demo.value, volume: volume.value };
}

async function medirConexao(
  connectionString: string,
  nome: "demo" | "volume",
  options: MetricsOptions,
) {
  const schema = options.isolado
    ? `ia04_${nome}_${randomUUID().replaceAll("-", "")}`
    : nome === "demo"
      ? options.schemaDemo
      : options.schemaVolume;
  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 0,
  });
  let prisma: PrismaClient | undefined;
  let transacao = false;
  let schemaCriado = false;
  let pid: number | undefined;
  try {
    const client = await pool.connect();
    try {
      await client.query(
        options.isolado
          ? "BEGIN"
          : "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY",
      );
      transacao = true;
      await client.query("SET LOCAL statement_timeout = '60s'");
      await client.query("SET LOCAL lock_timeout = '5s'");
      if (options.isolado) {
        await client.query(`CREATE SCHEMA "${schema}"`);
        await client.query(`SET LOCAL search_path TO "${schema}"`);
        const root = new URL("../prisma/migrations/", import.meta.url);
        for (const migration of (await readdir(root))
          .filter((n) => /^\d/.test(n))
          .sort()) {
          const sql = (
            await readFile(new URL(`${migration}/migration.sql`, root), "utf8")
          )
            .replace(/^BEGIN;\s*/, "")
            .replace(/COMMIT;\s*$/, "");
          await client.query(sql);
        }
        await client.query("COMMIT");
        transacao = false;
        schemaCriado = true;
      } else {
        const existe = await client.query(
          "SELECT 1 FROM information_schema.schemata WHERE schema_name = $1",
          [schema],
        );
        if (existe.rowCount !== 1)
          throw new MetricsConfigurationError(
            "Schema de metricas inexistente.",
          );
        await client.query(`SET LOCAL search_path TO "${schema}"`);
      }
    } finally {
      client.release();
    }
    prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
    if (options.isolado) {
      await prisma.$transaction(
        (tx) => (nome === "demo" ? runSeed(tx) : runVolumeSeed(tx)),
        { timeout: 120_000 },
      );
      await pool.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      transacao = true;
      await pool.query(`SET LOCAL search_path TO "${schema}"`);
      await pool.query("SET LOCAL statement_timeout = '60s'");
    }
    pid = (await pool.query<{ pid: number }>("SELECT pg_backend_pid() AS pid"))
      .rows[0]?.pid;
    const resultado: ResultadoBase = await medirBaseRecomendacao(
      prisma,
      nome,
      options.isolado ? "seed-isolado" : "branch-configurada",
      options.repeticoes,
    );
    if (nome === "volume") {
      console.log(`Comparando reforco regional: ${options.reforcoRegional}...`);
      resultado.comparacaoRegional = await medirReforcoRegional(
        prisma,
        options.reforcoRegional,
      );
    }
    const snapshot = (
      await pool.query<{ pid: number; readonly: string }>(
        "SELECT pg_backend_pid() AS pid, current_setting('transaction_read_only') AS readonly",
      )
    ).rows[0];
    if (!snapshot || snapshot.pid !== pid || snapshot.readonly !== "on")
      throw new Error("Snapshot de medicao foi substituido");
    if (
      resultado.tamanho.produtosElegiveis === 0 ||
      resultado.tamanho.compradoresAtivos === 0
    )
      throw new MetricsConfigurationError(
        "Base sem produtos elegiveis ou compradores ativos.",
      );
    return resultado;
  } finally {
    try {
      if (transacao) await pool.query("ROLLBACK");
    } finally {
      try {
        await prisma?.$disconnect();
        if (schemaCriado) await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
      } finally {
        await pool.end();
      }
    }
  }
}

export async function runMetrics(
  options: MetricsOptions,
  env: NodeJS.ProcessEnv = process.env,
) {
  const connectionStrings = validarMetricsEnvironment(options, env);
  const bases: ResultadoBase[] = [];
  for (const nome of ["demo", "volume"] as const) {
    console.log(`Medindo ${nome} por HTTP real...`);
    bases.push(await medirConexao(connectionStrings[nome], nome, options));
  }
  const relatorio = {
    versao: 2,
    capturadoEm: new Date().toISOString(),
    timezone: "America/Sao_Paulo",
    ambiente: {
      node: process.versions.node,
      plataforma: process.platform,
      http: "servidor local em loopback",
      snapshot: "REPEATABLE READ",
      repeticoes: options.repeticoes,
    },
    metodo: {
      coberturaCatalogo:
        "Produtos elegiveis distintos recomendados / produtos elegiveis * 100",
      coberturaContextos:
        "Contextos com resposta nao vazia / contextos avaliados * 100; cobertura v0 para categoria",
      fallback: "Respostas fallback-geral / contextos avaliados * 100",
      diversidade:
        "Media de categorias distintas por resposta, incluindo zero nas vazias; tambem uniao global",
      latencia:
        "HTTP completo ate receber e interpretar JSON; setup, seed e emissao de JWT excluidos",
      p95: "Nearest-rank: amostra ordenada no indice ceil(0.95 * n)-1",
      frio: "Cache de recomendacoes esvaziado antes de cada par; nao limpa caches PostgreSQL ou sistema operacional",
      quente:
        "Mesma requisicao imediatamente apos fria; categoria deve HIT; historico permanece BYPASS",
      populacao:
        "Todos os produtos publicos elegiveis e todos os compradores ativos em ordem de UUID",
      autenticacao:
        "JWTs efemeros apenas para a API local; autenticar e papel atuais reconsultados no banco",
      sementes: options.isolado
        ? "Seeds BD-05 versionados; volume usa PRNG fixo 20261013; sem alterar dados publicos"
        : "Branches e schemas existentes; nenhum seed ou migration executado",
      comparacaoRegional: {
        selecao: options.reforcoRegional,
        execucao:
          "CategoriaRecomendacaoStrategy direta, sem HTTP ou cache; mesma base e snapshot entre modos",
        coberturaCatalogo:
          "Produtos elegiveis distintos recomendados / produtos elegiveis * 100",
        acertoCategoria:
          "Itens da categoria do contexto / total de itens recomendados * 100",
        mesmaRegiao:
          "Itens com regiao nao nula igual a do contexto / total de itens recomendados * 100; regioes ausentes nao contam como coincidencia",
        visibilidade:
          "Mesma projecao publica do service: exclui IDs ocultos, repetidos e o proprio contexto; nao altera a Strategy",
        repeticoes:
          "Uma resposta por produto e modo; repeticoes de latencia HTTP nao duplicam qualidade",
      },
    },
    bases,
  };
  await mkdir(dirname(options.output), { recursive: true });
  const temporario = `${options.output}.${randomUUID()}.tmp`;
  await writeFile(temporario, JSON.stringify(relatorio, null, 2) + "\n");
  await rename(temporario, options.output);
  console.log(formatarTabelaMetricas(bases));
  console.log("JSON de metricas salvo.");
  return relatorio;
}

const executedFile = process.argv[1];
if (
  executedFile !== undefined &&
  import.meta.url === pathToFileURL(executedFile).href
) {
  Promise.resolve()
    .then(() => runMetrics(parseMetricsOptions(process.argv.slice(2))))
    .catch((error: unknown) => {
      console.error(
        error instanceof MetricsConfigurationError
          ? error.message
          : "Metricas recusadas ou falharam. Confira ambiente e conexao PostgreSQL.",
      );
      process.exitCode = 1;
    });
}

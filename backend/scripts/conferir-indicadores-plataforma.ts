import "dotenv/config";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, escapeIdentifier } from "pg";
import { z } from "zod";
import { Prisma, PrismaClient } from "../src/generated/prisma/client.js";
import {
  CONSULTAS_INDICADORES_PLATAFORMA,
  PrismaIndicadoresPlataformaRepository,
} from "../src/repositories/indicadores-plataforma.repository.js";
import { validateExplainEnvironment } from "./db-explain.js";

const optionsSchema = z.strictObject({
  schema: z.string().regex(/^[a-z][a-z0-9_]{0,62}$/),
  output: z.string().trim().min(1),
});
type ConferenceOptions = z.infer<typeof optionsSchema>;

export function parseConferenceOptions(args: string[]): ConferenceOptions {
  try {
    const { values } = parseArgs({
      args,
      options: {
        schema: { type: "string", default: "public" },
        output: {
          type: "string",
          default: `../evidencias/PI4-33-W14-Indices-FK-Admin/33.3-consultas-admin/coleta-${Date.now()}`,
        },
      },
      strict: true,
    });
    return optionsSchema.parse(values);
  } catch {
    throw new Error("Argumentos da conferencia invalidos");
  }
}

interface LinhaIndependente {
  fonte: string;
  grupo: string | null;
  ativo: boolean | null;
  quantidade: string;
  receita: string | null;
}

export async function runConference(
  input: ConferenceOptions,
  env: NodeJS.ProcessEnv = process.env,
) {
  const options = optionsSchema.parse(input);
  const connectionString = validateExplainEnvironment(env, false, true);
  const files = [
    "03-conferencia-volume.md",
    "04-explain.txt",
    "conferencia.json",
  ];
  await mkdir(options.output, { recursive: true });
  if (files.some((file) => existsSync(join(options.output, file))))
    throw new Error("Artefatos existentes; escolha outro diretorio");
  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 10000,
  });
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool, { schema: options.schema }),
  });
  try {
    await pool.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await pool.query(
      `SET LOCAL search_path TO ${escapeIdentifier(options.schema)}`,
    );
    await pool.query("SET LOCAL statement_timeout = '30s'");
    const readonly = await pool.query<{ readonly: string }>(
      "SELECT current_setting('transaction_read_only') AS readonly",
    );
    if (readonly.rows[0]?.readonly !== "on")
      throw new Error("Conexao de conferencia permite escrita");
    const sqlIndependente = await readFile(
      new URL(
        "../prisma/consultas/conferencia-indicadores-plataforma.sql",
        import.meta.url,
      ),
      "utf8",
    );
    const independente = (await pool.query<LinhaIndependente>(sqlIndependente))
      .rows;
    const usuarios = independente.find(
      (row) => row.fonte === "usuarios" && row.grupo === "artesao" && row.ativo,
    );
    const catalogo = independente.find((row) => row.fonte === "catalogo");
    const confirmados = independente.find(
      (row) => row.fonte === "pedidos" && row.grupo === "confirmado",
    );
    const esperado = {
      artesaosAtivos: usuarios?.quantidade ?? "0",
      produtosAtivos: catalogo?.quantidade ?? "0",
      pedidosConfirmados: confirmados?.quantidade ?? "0",
      receitaTotal: new Prisma.Decimal(confirmados?.receita ?? "0").toFixed(2),
    };
    const resultado = await new PrismaIndicadoresPlataformaRepository(
      prisma,
    ).obterDaPlataforma();
    const comparacao = (
      Object.keys(CONSULTAS_INDICADORES_PLATAFORMA) as (keyof typeof esperado)[]
    ).map((indicador) => {
      const repository =
        indicador === "receitaTotal"
          ? resultado.receitaTotal.toFixed(2)
          : resultado[indicador].toString();
      return {
        indicador,
        repository,
        sqlIndependente: esperado[indicador],
        divergencia: repository !== esperado[indicador],
      };
    });
    const planos: Record<string, unknown> = {};
    for (const [indicador, query] of Object.entries(
      CONSULTAS_INDICADORES_PLATAFORMA,
    )) {
      await prisma.$queryRaw(query);
      const [row] = await prisma.$queryRaw<{ "QUERY PLAN": unknown }[]>(
        Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`,
      );
      if (!row) throw new Error("EXPLAIN sem resultado");
      planos[indicador] = { sql: query.text, plano: row["QUERY PLAN"] };
    }
    const contexto = (
      await pool.query<{
        produtos: number;
        usuarios: number;
        pedidos: number;
        pedidosComTotal: number;
      }>(`SELECT (SELECT COUNT(*)::int FROM "Produto") AS produtos,
      (SELECT COUNT(*)::int FROM "Usuario") AS usuarios,
      (SELECT COUNT(*)::int FROM "Pedido") AS pedidos,
      (SELECT COUNT("total")::int FROM "Pedido") AS "pedidosComTotal"`)
    ).rows[0];
    const report = {
      capturadoEm: new Date().toISOString(),
      schema: options.schema,
      somenteLeitura: true,
      contexto,
      distribuicao: independente,
      comparacao,
      divergencias: comparacao.filter((row) => row.divergencia).length,
      planos,
    };
    const tabela = [
      "# 33.3: repository × SQL independente",
      "",
      "Snapshot REPEATABLE READ, somente leitura.",
      "",
      "| Indicador | Repository | SQL independente | Divergencia |",
      "|---|---:|---:|---:|",
      ...comparacao.map(
        (row) =>
          `| ${row.indicador} | ${row.repository} | ${row.sqlIndependente} | ${row.divergencia ? "1" : "0"} |`,
      ),
      "",
      `Massa: ${contexto?.produtos} produtos, ${contexto?.usuarios} usuarios, ${contexto?.pedidos} pedidos.`,
      "A receita foi comparada como Decimal, sem conversao para float.",
      "",
    ].join("\n");
    await writeFile(join(options.output, files[0] as string), tabela, {
      flag: "wx",
    });
    await writeFile(
      join(options.output, files[1] as string),
      JSON.stringify(planos, null, 2) + "\n",
      { flag: "wx" },
    );
    await writeFile(
      join(options.output, files[2] as string),
      JSON.stringify(report, null, 2) + "\n",
      { flag: "wx" },
    );
    if (report.divergencias)
      throw new Error("Divergencia nos indicadores da plataforma");
    return report;
  } finally {
    try {
      await pool.query("ROLLBACK");
    } finally {
      try {
        await prisma.$disconnect();
      } finally {
        await pool.end();
      }
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  Promise.resolve()
    .then(() => runConference(parseConferenceOptions(process.argv.slice(2))))
    .then(() => {
      console.log("Conferencia concluida com divergencia zero.");
    })
    .catch(() => {
      console.error(
        "Conferencia recusada ou falhou; confira ambiente e artefatos.",
      );
      process.exitCode = 1;
    });
}

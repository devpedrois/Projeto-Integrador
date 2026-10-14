import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import type { PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { databasePool } from "../helpers/database.js";

const prismaRoot = new URL("../../prisma/", import.meta.url);
const documentPath = new URL(
  "../../../sprints/semana-10-11/01-Modelo-Fisico-BD.md",
  import.meta.url,
);
const schema = readFileSync(new URL("schema.prisma", prismaRoot), "utf8");
const models = [...schema.matchAll(/^model (\w+) \{/gm)].map(
  (match) => match[1],
);
let client: PoolClient | undefined;
let ddl: string;
let document: string;
const suffix = randomUUID().replaceAll("-", "");
const ddlSchema = `bd01_ddl_${suffix}`;
const migrationsSchema = `bd01_migrations_${suffix}`;

function normalize(value: string, namespace: string): string {
  return value.replaceAll(`${namespace}.`, "");
}

async function catalog(namespace: string) {
  if (!client) throw new Error("Conexao de teste indisponivel");
  const columns = await client.query(
    `SELECT table_name, column_name, udt_name, is_nullable,
            numeric_precision, numeric_scale, datetime_precision, column_default
     FROM information_schema.columns
     WHERE table_schema = $1 ORDER BY table_name, column_name`,
    [namespace],
  );
  const constraints = await client.query(
    `SELECT c.relname AS tabela, con.conname AS nome,
            pg_get_constraintdef(con.oid) AS definicao
     FROM pg_constraint con
     JOIN pg_class c ON c.oid = con.conrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = $1 ORDER BY c.relname, con.conname`,
    [namespace],
  );
  const indexes = await client.query(
    `SELECT indexname AS nome, indexdef AS definicao FROM pg_indexes
     WHERE schemaname = $1 ORDER BY indexname`,
    [namespace],
  );
  const sequence = await client.query(
    `SELECT sequencename, data_type, start_value, min_value, max_value,
            increment_by, cycle
     FROM pg_sequences WHERE schemaname = $1 ORDER BY sequencename`,
    [namespace],
  );
  const enums = await client.query(
    `SELECT t.typname AS nome, e.enumlabel AS valor
     FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
     JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = $1 ORDER BY t.typname, e.enumsortorder`,
    [namespace],
  );
  const sequenceOwner = await client.query(
    `SELECT sequence.relname AS sequence, parent.relname AS tabela,
            attribute.attname AS coluna
     FROM pg_class sequence
     JOIN pg_namespace n ON n.oid = sequence.relnamespace
     JOIN pg_depend dependency ON dependency.objid = sequence.oid
       AND dependency.deptype = 'a'
     JOIN pg_class parent ON parent.oid = dependency.refobjid
     JOIN pg_attribute attribute ON attribute.attrelid = parent.oid
       AND attribute.attnum = dependency.refobjsubid
     WHERE n.nspname = $1 AND sequence.relkind = 'S'`,
    [namespace],
  );
  return JSON.parse(
    normalize(
      JSON.stringify({
        columns: columns.rows,
        constraints: constraints.rows,
        indexes: indexes.rows,
        sequence: sequence.rows,
        enums: enums.rows,
        sequenceOwner: sequenceOwner.rows,
      }),
      namespace,
    ),
  ) as unknown;
}

beforeAll(async () => {
  ddl = readFileSync(new URL("ddl-fisico.sql", prismaRoot), "utf8");
  document = readFileSync(documentPath, "utf8").replaceAll("\r\n", "\n");
  client = await databasePool.connect();
  await client.query("BEGIN");
  await client.query(`CREATE SCHEMA "${ddlSchema}"`);
  await client.query(`SET LOCAL search_path TO "${ddlSchema}"`);
  await client.query(ddl);
  await client.query(`CREATE SCHEMA "${migrationsSchema}"`);
  await client.query(`SET LOCAL search_path TO "${migrationsSchema}"`);
  const migrations = new URL("migrations/", prismaRoot);
  for (const name of readdirSync(migrations)
    .filter((n) => /^\d/.test(n))
    .sort()) {
    const sql = readFileSync(
      new URL(`${name}/migration.sql`, migrations),
      "utf8",
    ).replace(/^\s*(BEGIN|COMMIT);\s*$/gm, "");
    await client.query(sql);
  }
}, 30000);

afterAll(async () => {
  try {
    if (client) await client.query("ROLLBACK");
  } finally {
    client?.release();
    await databasePool.end();
  }
});

describe("BD-01: modelo fisico documentado", () => {
  it("recria o catalogo das migrations sem alterar o schema existente", async () => {
    expect(await catalog(ddlSchema)).toEqual(await catalog(migrationsSchema));
  });

  it("documenta todas as tabelas e suas colunas fisicas", async () => {
    if (!client) throw new Error("Conexao de teste indisponivel");
    const tables = await client.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name",
      [ddlSchema],
    );
    expect(tables.rows.map((row) => row.table_name)).toEqual(
      [...models].sort(),
    );
    for (const model of models) {
      const section = document
        .split("\n### ")
        .find((part) => part.split("\n")[0]?.endsWith(`\`${model}\``));
      expect(section, model).toBeDefined();
      const columns = await client.query<{ column_name: string }>(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2",
        [ddlSchema, model],
      );
      for (const column of columns.rows) {
        const documented = section
          ?.split("\n")
          .some(
            (line) =>
              line.split("|")[1]?.trim() === `\`${column.column_name}\``,
          );
        expect(documented, `${model}.${column.column_name}`).toBe(true);
      }
    }
  });

  it("vincula todos os indices e CHECKs ao documento", async () => {
    if (!client) throw new Error("Conexao de teste indisponivel");
    const indexes = await client.query<{ indexname: string }>(
      "SELECT indexname FROM pg_indexes WHERE schemaname = $1",
      [ddlSchema],
    );
    const indexSection = document
      .split("## 6. Indices e consultas")[1]
      ?.split("## 7.")[0];
    expect(indexSection).toBeDefined();
    for (const index of indexes.rows) {
      expect(indexSection, index.indexname).toContain(`\`${index.indexname}\``);
    }
    const checks = await client.query<{ conname: string }>(
      `SELECT conname FROM pg_constraint
       WHERE contype = 'c' AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = $1)`,
      [ddlSchema],
    );
    for (const check of checks.rows) expect(document).toContain(check.conname);
  });

  it("gera numeros de pedido usando a sequence restaurada", async () => {
    if (!client) throw new Error("Conexao de teste indisponivel");
    await client.query(`SET LOCAL search_path TO "${ddlSchema}"`);
    const buyer = randomUUID();
    await client.query(
      `INSERT INTO "Usuario" (id, nome, email, "senhaHash") VALUES ($1, 'Comprador sintetico', 'bd01@origem.test', 'sintetico-para-validacao')`,
      [buyer],
    );
    const result = await client.query<{ numero: string }>(
      `INSERT INTO "Pedido" (id, "compradorId") VALUES ($1, $3), ($2, $3) RETURNING numero`,
      [randomUUID(), randomUUID(), buyer],
    );
    const year = (
      await client.query<{ ano: string }>(
        "SELECT to_char(CURRENT_TIMESTAMP, 'YYYY') AS ano",
      )
    ).rows[0]?.ano;
    expect(result.rows.map((row) => row.numero)).toEqual([
      `ORG-${year}-000001`,
      `ORG-${year}-000002`,
    ]);
  });
});

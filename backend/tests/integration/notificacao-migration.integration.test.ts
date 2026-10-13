import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { afterAll, expect, it } from "vitest";
import { databasePool } from "../helpers/database.js";

const migrationName = "20261013230100_add_notificacao";
const migrationsRoot = new URL("../../prisma/migrations/", import.meta.url);

afterAll(async () => {
  await databasePool.end();
});

it("BD-06 aplica apos o historico existente em PostgreSQL real", async () => {
  const client = await databasePool.connect();
  const schemaName = `bd06_${randomUUID().replaceAll("-", "")}`;
  try {
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA "${schemaName}"; SET LOCAL search_path TO "${schemaName}"`);
    const previousMigrations = readdirSync(migrationsRoot)
      .filter((name) => /^\d/.test(name) && name < migrationName)
      .sort();
    for (const name of [...previousMigrations, migrationName]) {
      const sql = readFileSync(new URL(`${name}/migration.sql`, migrationsRoot), "utf8")
        .replace(/^BEGIN;\s*/, "")
        .replace(/COMMIT;\s*$/, "");
      await client.query(sql);
    }
    const result = await client.query(`SELECT count(*)::int AS total FROM "Notificacao"`);
    expect(result.rows).toEqual([{ total: 0 }]);
    const constraint = await client.query<{ definition: string }>(`
      SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint
      WHERE conrelid = '"Notificacao"'::regclass AND contype = 'f'
      ORDER BY conname
    `);
    expect(constraint.rows).toHaveLength(2);
    expect(constraint.rows.every((row) => row.definition.includes("ON DELETE RESTRICT"))).toBe(true);
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
}, 15000);

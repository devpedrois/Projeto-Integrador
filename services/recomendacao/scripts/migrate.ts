import "dotenv/config";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { Pool, escapeIdentifier } from "pg";
import { z } from "zod";
import { postgresUrl, schemaName } from "../src/config/environment.js";

export async function migrate(pool: Pool, schema: string): Promise<void> {
  const name = escapeIdentifier(schemaName.parse(schema));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `recomendacao-migrate:${schema}`,
    ]);
    const identity = await client.query<{ owner: boolean }>(
      "SELECT pg_get_userbyid(nspowner) = current_user AS owner FROM pg_namespace WHERE nspname=$1",
      [schema],
    );
    if (!identity.rows[0]?.owner)
      throw new Error("Migrations require the private schema owner");
    await client.query(`SET LOCAL search_path TO ${name}, pg_catalog`);
    await client.query(
      `CREATE TABLE IF NOT EXISTS ${name}.schema_migrations (nome text PRIMARY KEY, checksum text NOT NULL, aplicado_em timestamptz NOT NULL DEFAULT now())`,
    );
    const root = new URL("../migrations/", import.meta.url);
    for (const file of (await readdir(root))
      .filter((name) => /^\d+_[a-z0-9_]+\.sql$/.test(name))
      .sort()) {
      const sql = await readFile(new URL(file, root), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const existing = await client.query<{ checksum: string }>(
        `SELECT checksum FROM ${name}.schema_migrations WHERE nome=$1`,
        [file],
      );
      if (existing.rowCount) {
        if (existing.rows[0]?.checksum !== checksum)
          throw new Error("Applied migration checksum changed");
        continue;
      }
      await client.query(sql);
      await client.query(
        `INSERT INTO ${name}.schema_migrations (nome,checksum) VALUES ($1,$2)`,
        [file, checksum],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const parsed = z
    .object({
      DATABASE_URL: postgresUrl,
      RECOMENDACAO_SCHEMA: schemaName.default("recomendacao"),
    })
    .safeParse(process.env);
  if (!parsed.success) throw new Error("Invalid migration configuration");
  const pool = new Pool({ connectionString: parsed.data.DATABASE_URL });
  try {
    await migrate(pool, parsed.data.RECOMENDACAO_SCHEMA);
    process.stdout.write("Migrations applied.\n");
  } finally {
    await pool.end();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(() => {
    process.stderr.write("Failed to apply recommendation migrations.\n");
    process.exitCode = 1;
  });
}

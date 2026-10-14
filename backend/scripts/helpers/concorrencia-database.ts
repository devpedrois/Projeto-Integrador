import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../../src/generated/prisma/client.js";

export async function criarBancoConcorrencia(connectionString: string) {
  const schema = `web10_${randomUUID().replaceAll("-", "")}`;
  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 10_000,
    options: `-c search_path=${schema},public`,
  });
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}"`);
      const root = new URL("../../prisma/migrations/", import.meta.url);
      for (const migration of (await readdir(root))
        .filter((name) => /^\d/.test(name))
        .sort()) {
        const sql = await readFile(
          new URL(`${migration}/migration.sql`, root),
          "utf8",
        );
        await client.query(
          sql.replace(/^BEGIN;\s*/, "").replace(/COMMIT;\s*$/, ""),
        );
      }
      await client.query("COMMIT");
    } catch {
      await client.query("ROLLBACK");
      throw new Error("Falha ao preparar schema temporario de concorrencia.");
    } finally {
      client.release();
    }
  } catch {
    await pool.end();
    throw new Error("Falha ao preparar schema temporario de concorrencia.");
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool, { schema }),
    transactionOptions: { maxWait: 60_000, timeout: 60_000 },
  });
  return {
    schema,
    prisma,
    async fechar(): Promise<void> {
      try {
        await prisma.$disconnect();
        await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
      } finally {
        await pool.end();
      }
    },
  };
}

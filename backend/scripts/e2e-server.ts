import "dotenv/config";
import { createHash, randomUUID } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { createApp } from "../src/app.js";
import { runSeed } from "../prisma/seed.js";

function identity(value: string): string {
  const url = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    url.pathname.length < 2
  )
    throw new Error("Conexao E2E invalida");
  return `${url.hostname.replace(/-pooler(?=\.)/, "")}:${url.port || "5432"}${url.pathname}`;
}

export function validateE2EEnvironment(env: NodeJS.ProcessEnv) {
  const target = env.E2E_DATABASE_URL;
  if (!target || env.NODE_ENV === "production")
    throw new Error("E2E requer branch de teste fora de producao");
  const database = identity(target);
  if (
    [env.DATABASE_URL, env.DIRECT_URL, env.DATABASE_URL_DEPLOY].some(
      (value) => value && identity(value) === database,
    )
  )
    throw new Error("E2E requer branch separada das conexoes padrao e deploy");
  const url = new URL(target);
  url.hostname = url.hostname.replace(/-pooler(?=\.)/, "");
  return {
    databaseUrl: url.href,
    port: z.coerce
      .number()
      .int()
      .min(1)
      .max(65535)
      .parse(env.E2E_API_PORT ?? "3313"),
  };
}

function runtime(env: NodeJS.ProcessEnv) {
  const id = z
    .string()
    .regex(/^[a-f0-9]{32}$/)
    .parse(env.E2E_RUN_ID);
  const file = z.string().min(1).parse(env.E2E_RUNTIME_FILE);
  return { id, file, schema: `e2e31_${id}` };
}

async function cleanup(env: NodeJS.ProcessEnv) {
  const config = validateE2EEnvironment(env);
  const expected = runtime(env);
  const saved: unknown = JSON.parse(await readFile(expected.file, "utf8"));
  const metadata = z
    .object({
      id: z.literal(expected.id),
      schema: z.literal(expected.schema),
      databaseHash: z.string(),
    })
    .strict()
    .parse(saved);
  if (
    metadata.databaseHash !==
    createHash("sha256").update(identity(config.databaseUrl)).digest("hex")
  )
    throw new Error("Banco da limpeza diverge do teste");
  const pool = new Pool({ connectionString: config.databaseUrl, max: 1 });
  try {
    await pool.query(`DROP SCHEMA IF EXISTS "${expected.schema}" CASCADE`);
    const result = await pool.query(
      "SELECT 1 FROM pg_namespace WHERE nspname = $1",
      [expected.schema],
    );
    if (result.rowCount !== 0)
      throw new Error("Schema E2E permaneceu no banco");
    await writeFile(
      new URL("cleanup.json", pathToFileURL(expected.file)),
      JSON.stringify({ schema: expected.schema, removed: true }) + "\n",
      { flag: "wx" },
    );
    console.log("Schema E2E removido e ausencia confirmada.");
  } finally {
    await pool.end();
  }
}

async function serve(env: NodeJS.ProcessEnv) {
  const config = validateE2EEnvironment(env);
  const { id, file, schema } = runtime(env);
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 3,
    options: `-c search_path=${schema},public`,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}"`);
      const root = new URL("../prisma/migrations/", import.meta.url);
      for (const name of (await readdir(root))
        .filter((name) => /^\d/.test(name))
        .sort()) {
        const sql = (
          await readFile(new URL(`${name}/migration.sql`, root), "utf8")
        )
          .replace(/^BEGIN;\s*/, "")
          .replace(/COMMIT;\s*$/, "");
        await client.query(sql);
      }
      await writeFile(
        file,
        JSON.stringify({
          id,
          schema,
          databaseHash: createHash("sha256")
            .update(identity(config.databaseUrl))
            .digest("hex"),
        }) + "\n",
        { flag: "wx" },
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    await prisma.$transaction((tx) => runSeed(tx), { timeout: 120000 });
    const server = createApp(prisma, {
      JWT_SECRET: randomUUID(),
      COOKIE_SECURE: false,
    }).listen(config.port, "127.0.0.1");
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    console.log("API E2E real pronta com migrations e seed demo isolados.");
  } catch (error) {
    await prisma.$disconnect();
    await pool.end();
    throw error;
  }
}

const executedFile = process.argv[1];
if (executedFile && import.meta.url === pathToFileURL(executedFile).href) {
  Promise.resolve()
    .then(() =>
      process.argv[2] === "--cleanup"
        ? cleanup(process.env)
        : serve(process.env),
    )
    .catch(() => {
      process.stderr.write(
        "Ambiente E2E recusado ou falhou. Confira variaveis e branch de teste.\n",
      );
      process.exitCode = 1;
    });
}

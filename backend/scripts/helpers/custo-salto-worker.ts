import { createServer, type Server } from "node:http";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Express } from "express";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import type { createApp as criarApi } from "../../src/app.js";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { MemoryCacheStore } from "../../src/utils/cache.js";

async function main() {
  if (
    !process.send ||
    !process.env.SALTO_DATABASE_URL ||
    process.env.NODE_ENV === "production"
  )
    throw new Error("Worker exclusivo do benchmark");
  const tipo = z.enum(["api", "servico"]).parse(process.argv[2]);
  const root = z.string().min(1).parse(process.argv[3]);
  const token = z
    .string()
    .min(32)
    .parse(process.env.RECOMENDACAO_SERVICE_TOKEN);
  const snapshot = z
    .string()
    .regex(/^[0-9a-f]{8}-[0-9a-f]{8}-[0-9]+$/i)
    .parse(process.env.SALTO_SNAPSHOT);
  const pool = new Pool({
    connectionString: process.env.SALTO_DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 0,
  });
  const cache = new MemoryCacheStore();
  let prisma: PrismaClient | undefined;
  let server: Server | undefined;
  let parando = false;
  const parar = async () => {
    if (parando) return;
    parando = true;
    if (server)
      await new Promise<void>((done) => {
        server?.close(() => done());
        server?.closeAllConnections();
      });
    await pool.query("ROLLBACK");
    if (prisma) await prisma.$disconnect();
    await pool.end();
    process.disconnect?.();
  };
  process.once("disconnect", () => {
    void parar();
  });
  try {
    await pool.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await pool.query(`SET TRANSACTION SNAPSHOT '${snapshot}'`);
    await pool.query("SET LOCAL statement_timeout = '30s'");
    const status = await pool.query<{ readonly: string }>(
      "SELECT current_setting('transaction_read_only') AS readonly",
    );
    if (status.rows[0]?.readonly !== "on")
      throw new Error("Sessao precisa ser read-only");
    let app: Express;
    if (tipo === "api") {
      const modulo = (await import(
        pathToFileURL(resolve(root, "backend/src/app.ts")).href
      )) as { createApp: typeof criarApi };
      const cliente = (await import(
        pathToFileURL(resolve(root, "backend/src/generated/prisma/client.ts"))
          .href
      )) as { PrismaClient: typeof PrismaClient };
      prisma = new cliente.PrismaClient({
        adapter: new PrismaPg(pool, { schema: "public" }),
      });
      app = modulo.createApp(
        prisma,
        {
          JWT_SECRET: undefined,
          COOKIE_SECURE: false,
          CACHE_TTL_SECONDS: 1,
          RECOMENDACAO_URL: z.url().parse(process.env.RECOMENDACAO_URL),
          RECOMENDACAO_SERVICE_TOKEN: token,
          RECOMENDACAO_TIMEOUT_MS: 800,
        },
        { cacheStore: cache, logCache: () => {} },
      );
    } else {
      const modulo = (await import(
        pathToFileURL(resolve(root, "services/recomendacao/src/app.ts")).href
      )) as {
        createApp: (
          pool: Pool,
          env: { API_SCHEMA: string; RECOMENDACAO_SERVICE_TOKEN: string },
        ) => Express;
      };
      app = modulo.createApp(pool, {
        API_SCHEMA: "public",
        RECOMENDACAO_SERVICE_TOKEN: token,
      });
    }
    server = createServer((request, response) => {
      if (tipo === "servico")
        response.once("finish", () => {
          if (
            request.url?.startsWith("/recomendacoes?") &&
            response.statusCode === 200
          )
            process.send?.({ evento: "chamada" });
        });
      app(request, response);
    });
    await new Promise<void>((done, reject) => {
      server?.once("error", reject);
      server?.listen(0, "127.0.0.1", done);
    });
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Porta ausente");
    process.on("message", (message: unknown) => {
      const parsed = z
        .object({ evento: z.enum(["invalidar", "parar"]) })
        .safeParse(message);
      if (!parsed.success) return;
      if (parsed.data.evento === "parar") {
        void parar();
        return;
      }
      void cache
        .invalidarPorPrefixo("recomendacoes:")
        .then(() => process.send?.({ evento: "invalidado" }));
    });
    process.send({ evento: "pronto", porta: address.port });
  } catch {
    process.send?.({ evento: "falha" });
    await parar();
    process.exitCode = 1;
  }
}

void main().catch(() => {
  process.send?.({ evento: "falha" });
  process.exitCode = 1;
});

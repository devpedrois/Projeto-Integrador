import { Pool } from "pg";
import { createPrismaClientWithPool } from "../../src/database/prisma/client.js";
import { createApp } from "../../src/app.js";
import { MemoryCacheStore } from "../../src/utils/cache.js";

const schema = process.env.CACHE_TEST_SCHEMA;
const connectionString = process.env.CACHE_TEST_DATABASE_URL;
const secret = process.env.CACHE_TEST_JWT_SECRET;
if (
  !schema ||
  !/^[a-z][a-z0-9_]{0,62}$/.test(schema) ||
  !connectionString ||
  !secret
)
  throw new Error("Configuracao do servidor de medicao incompleta");
const pool = new Pool({
  connectionString,
  max: 2,
  options: `-c search_path=${schema},public`,
});
const prisma = createPrismaClientWithPool(pool, schema);
const store = new MemoryCacheStore();
const app = createApp(
  prisma,
  { JWT_SECRET: secret, COOKIE_SECURE: false },
  { cacheStore: store },
);
const server = app.listen(0, "127.0.0.1", () => {
  const address = server.address();
  if (address && typeof address !== "string")
    process.send?.({
      tipo: "pronto",
      origem: `http://127.0.0.1:${address.port}`,
    });
});
let fechando = false;
async function fechar() {
  if (fechando) return;
  fechando = true;
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
    server.closeAllConnections();
  });
  await prisma.$disconnect();
  await pool.end();
  process.disconnect?.();
}
process.on("message", (message: unknown) => {
  if (typeof message !== "object" || message === null || !("tipo" in message))
    return;
  if (message.tipo === "fechar") {
    void fechar().catch(() => {
      process.exitCode = 1;
      process.disconnect?.();
    });
  } else if (
    message.tipo === "invalidar" &&
    "artesaoId" in message &&
    typeof message.artesaoId === "string" &&
    /^[a-f0-9-]{36}$/.test(message.artesaoId)
  ) {
    void store
      .invalidarPorPrefixo(`indicadores:artesao:${message.artesaoId}`)
      .then(() => process.send?.({ tipo: "invalidado" }));
  }
});
process.on("disconnect", () => {
  void fechar();
});

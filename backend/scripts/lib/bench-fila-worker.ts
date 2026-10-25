import { createPrismaClient } from "../../src/database/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.js";
import { createPgBossClient } from "../../src/queues/pg-boss.client.js";
import { startWorker } from "../../src/worker.js";

async function main() {
  const schema = process.env.BENCH_FILA_SCHEMA;
  const dataSchema = process.env.BENCH_FILA_DATA_SCHEMA ?? "public";
  if (
    !process.send ||
    !schema ||
    !/^bench_fila_[a-f0-9]{32}$/.test(schema) ||
    !/^(public|web03_[a-f0-9]{32})$/.test(dataSchema)
  )
    throw new Error("Invalid benchmark worker configuration");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing benchmark database");
  const prisma =
    dataSchema === "public"
      ? createPrismaClient(url)
      : new PrismaClient({
          adapter: new PrismaPg(
            { connectionString: url },
            { schema: dataSchema },
          ),
        });
  const boss = createPgBossClient(url, { schema });
  const worker = await startWorker(process.env, { prisma, boss });
  process.on("message", (message: unknown) => {
    if (message !== "stop") return;
    void worker
      .stop()
      .then(() => {
        if (process.connected) process.disconnect?.();
      })
      .catch(() => {
        process.stderr.write("Benchmark worker shutdown failed\n");
        process.exitCode = 1;
        if (process.connected) process.disconnect?.();
      });
  });
  process.once("disconnect", () => {
    void worker.stop().catch(() => {
      process.exitCode = 1;
    });
  });
  process.send?.({ ready: true, pid: process.pid });
}

main().catch(() => {
  process.stderr.write("Benchmark worker failed\n");
  process.exitCode = 1;
  if (process.connected) process.disconnect?.();
});

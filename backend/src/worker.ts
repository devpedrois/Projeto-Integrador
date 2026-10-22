import "dotenv/config";
import { pathToFileURL } from "node:url";
import {
  EnvironmentValidationError,
  parseEnvironment,
} from "./config/environment.js";
import { createPrismaClient } from "./database/prisma/client.js";
import {
  iniciarConsumidor,
  type QueueInfrastructure,
} from "./queues/bootstrap.js";
import { createPgBossClient } from "./queues/pg-boss.client.js";

export async function startWorker(
  input: NodeJS.ProcessEnv = process.env,
  infrastructure?: QueueInfrastructure,
) {
  const environment = parseEnvironment(input);
  const prisma =
    infrastructure?.prisma ?? createPrismaClient(environment.DATABASE_URL);
  const boss =
    infrastructure?.boss ?? createPgBossClient(environment.DATABASE_URL);
  boss.on("error", () => {
    process.stderr.write("Notification queue error\n");
  });
  try {
    await iniciarConsumidor(boss, prisma);
  } catch {
    await Promise.allSettled([
      boss.stop({ graceful: false }),
      prisma.$disconnect(),
    ]);
    throw new Error("Worker startup failed");
  }

  let encerramento: Promise<void> | undefined;
  function stop(): Promise<void> {
    encerramento ??= (async () => {
      try {
        await boss.stop({ graceful: true });
      } finally {
        await prisma.$disconnect();
        process.off("SIGINT", encerrar);
        process.off("SIGTERM", encerrar);
      }
    })();
    return encerramento;
  }
  function encerrar(): void {
    void stop().catch(() => {
      process.stderr.write("Worker shutdown failed\n");
      process.exitCode = 1;
    });
  }
  process.on("SIGINT", encerrar);
  process.on("SIGTERM", encerrar);
  return { boss, prisma, stop };
}

const executedFile = process.argv[1];
if (
  executedFile !== undefined &&
  import.meta.url === pathToFileURL(executedFile).href
) {
  startWorker().catch((error: unknown) => {
    const message =
      error instanceof EnvironmentValidationError
        ? error.message
        : "Worker startup failed";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}

import "dotenv/config";
import { pathToFileURL } from "node:url";
import type { PgBoss } from "pg-boss";
import { createApp } from "./app.js";
import {
  EnvironmentValidationError,
  parseEnvironment,
} from "./config/environment.js";
import { createPrismaClient } from "./database/prisma/client.js";
import {
  iniciarConsumidor,
  iniciarPublicador,
  type QueueInfrastructure,
} from "./queues/bootstrap.js";
import { createPgBossClient } from "./queues/pg-boss.client.js";

export async function startServer(
  input: NodeJS.ProcessEnv = process.env,
  infrastructure?: QueueInfrastructure,
) {
  const environment = parseEnvironment(input);
  const prisma =
    infrastructure?.prisma ?? createPrismaClient(environment.DATABASE_URL);
  let boss: PgBoss | undefined;
  let pararPublicador: (() => Promise<void>) | undefined;
  try {
    boss = infrastructure?.boss ?? createPgBossClient(environment.DATABASE_URL);
    boss.on("error", () => {
      process.stderr.write("Notification queue error\n");
    });
    pararPublicador = await iniciarPublicador(
      boss,
      prisma,
      environment.NOTIFICATION_PUBLISHER_INTERVAL_MS,
    );
    if (environment.RUN_WORKER_IN_API) {
      await iniciarConsumidor(boss, prisma);
    }

    const app = createApp(prisma, environment);
    const server = app.listen(environment.PORT, environment.HOST);
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", () => reject(new Error("Backend startup failed")));
    });
    server.once("close", () => {
      void pararPublicador?.();
    });
    return { server, prisma, boss };
  } catch {
    await pararPublicador?.();
    try {
      await boss?.stop({ graceful: false });
    } finally {
      await prisma.$disconnect();
    }
    throw new Error("Backend startup failed");
  }
}

const executedFile = process.argv[1];
if (
  executedFile !== undefined &&
  import.meta.url === pathToFileURL(executedFile).href
) {
  startServer().catch((error: unknown) => {
    const message =
      error instanceof EnvironmentValidationError
        ? error.message
        : "Backend startup failed";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}

import "dotenv/config";
import { pathToFileURL } from "node:url";
import { createApp } from "./app.js";
import { parseEnvironment } from "./config/environment.js";
import { createPrismaClient } from "./database/prisma/client.js";

export async function startServer(input: NodeJS.ProcessEnv = process.env) {
  const environment = parseEnvironment(input);
  const prisma = createPrismaClient(environment.DATABASE_URL);
  try {
    const app = createApp(prisma);
    const server = app.listen(environment.PORT, "127.0.0.1");
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", () => reject(new Error("Backend startup failed")));
    });
    return { server, prisma };
  } catch {
    await prisma.$disconnect();
    throw new Error("Backend startup failed");
  }
}

const executedFile = process.argv[1];
if (
  executedFile !== undefined &&
  import.meta.url === pathToFileURL(executedFile).href
) {
  startServer().catch(() => {
    process.stderr.write("Backend startup failed\n");
    process.exitCode = 1;
  });
}

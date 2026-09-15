import "dotenv/config";
import { pathToFileURL } from "node:url";
import type { PrismaClient } from "../src/generated/prisma/client.js";
import { parseEnvironment } from "../src/config/environment.js";
import { createPrismaClient } from "../src/database/prisma/client.js";

export const seedProductId = "11111111-1111-4111-8111-111111111111";

export async function runSeed(prisma: PrismaClient): Promise<void> {
  await prisma.produto.upsert({
    where: { id: seedProductId },
    update: {},
    create: {
      id: seedProductId,
      nome: "Produto FCCPD",
      quantidadeEstoque: 1,
    },
  });
}

async function main(): Promise<void> {
  const environment = parseEnvironment(process.env);
  const prisma = createPrismaClient(environment.DATABASE_URL);
  try {
    await runSeed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

const executedFile = process.argv[1];
if (
  executedFile !== undefined &&
  import.meta.url === pathToFileURL(executedFile).href
) {
  main().catch(() => {
    process.stderr.write("Database seed failed\n");
    process.exitCode = 1;
  });
}

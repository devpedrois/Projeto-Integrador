import "dotenv/config";
import { parseEnvironment } from "../src/config/environment.js";
import { createPrismaClient } from "../src/database/prisma/client.js";
import { CategoriaRecomendacaoStrategy } from "../src/integrations/recommendation/categoria-recomendacao.strategy.js";
import { calcularMetricasBaseline } from "../src/integrations/recommendation/recomendacao-metricas.js";
import { PrismaRecomendacaoRepository } from "../src/repositories/recomendacao.repository.js";

async function main(): Promise<void> {
  const environment = parseEnvironment(process.env);
  const prisma = createPrismaClient(environment.DATABASE_URL);
  const repository = new PrismaRecomendacaoRepository(prisma);
  const strategy = new CategoriaRecomendacaoStrategy(repository);

  try {
    const metricas = await calcularMetricasBaseline(repository, strategy);
    console.log(JSON.stringify(metricas, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    "Recommendation metrics calculation failed:",
    error instanceof Error ? error.message : "unknown error",
  );
  process.exitCode = 1;
});

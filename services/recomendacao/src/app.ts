import express from "express";
import helmet from "helmet";
import type { Pool } from "pg";
import type { Environment } from "./config/environment.js";
import { RecomendacaoController } from "./controllers/recomendacao.controller.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { PgRecomendacaoRepository } from "./repositories/recomendacao.repository.js";
import { createRecomendacaoRouter } from "./routes/recomendacao.routes.js";
import { RecomendacaoService } from "./services/recomendacao.service.js";
import { CategoriaRecomendacaoStrategy } from "./strategies/categoria-recomendacao.strategy.js";
import { HistoricoCompraRecomendacaoStrategy } from "./strategies/historico-compra-recomendacao.strategy.js";

export function createApp(
  pool: Pool,
  environment: Pick<Environment, "API_SCHEMA" | "RECOMENDACAO_SERVICE_TOKEN">,
) {
  const repo = new PgRecomendacaoRepository(pool, environment.API_SCHEMA);
  const service = new RecomendacaoService(
    new CategoriaRecomendacaoStrategy(repo),
    new HistoricoCompraRecomendacaoStrategy(repo),
  );
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    createRecomendacaoRouter(
      new RecomendacaoController(service, pool),
      environment.RECOMENDACAO_SERVICE_TOKEN,
    ),
  );
  app.use(errorMiddleware);
  return app;
}

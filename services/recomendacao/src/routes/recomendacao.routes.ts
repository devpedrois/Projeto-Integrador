import express, { Router } from "express";
import type { RecomendacaoController } from "../controllers/recomendacao.controller.js";
import { tokenServico } from "../middlewares/token-servico.middleware.js";

export function createRecomendacaoRouter(
  controller: RecomendacaoController,
  token: string,
): Router {
  const router = Router();
  router.get("/health", controller.health);
  router.use(tokenServico(token));
  router.use(express.json({ limit: "4kb" }));
  router.get("/recomendacoes", controller.obter);
  router.get("/recomendacoes/historico", controller.obterHistorico);
  return router;
}

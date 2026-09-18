import { Router } from "express";
import type { RecomendacaoController } from "../controllers/recomendacao.controller.js";
import { validateObterRecomendacoes } from "../validators/recomendacao.validator.js";

export function createRecomendacaoRouter(controller: RecomendacaoController): Router {
  const router = Router();
  router.get("/recomendacoes", validateObterRecomendacoes, controller.obter);
  return router;
}

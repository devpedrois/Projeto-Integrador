import { Router, type RequestHandler } from "express";
import type { RecomendacaoController } from "../controllers/recomendacao.controller.js";
import {
  validateObterRecomendacoes,
  validateObterRecomendacoesPessoais,
} from "../validators/recomendacao.validator.js";
import { exigirPapel } from "../middlewares/role.middleware.js";

export function createRecomendacaoRouter(
  controller: RecomendacaoController,
  autenticarUsuario: RequestHandler,
): Router {
  const router = Router();
  router.get("/recomendacoes", validateObterRecomendacoes, controller.obter);
  router.get(
    "/recomendacoes/para-mim",
    autenticarUsuario,
    exigirPapel("comprador"),
    validateObterRecomendacoesPessoais,
    controller.obterParaMim,
  );
  return router;
}

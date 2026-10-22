import { Router, type RequestHandler } from "express";
import type { AvaliacaoController } from "../controllers/avaliacao.controller.js";
import { exigirPapel } from "../middlewares/role.middleware.js";

export function createAvaliacaoRouter(
  controller: AvaliacaoController,
  autenticarUsuario: RequestHandler,
): Router {
  const router = Router();
  router.get(
    "/avaliacoes/elegibilidade",
    autenticarUsuario,
    exigirPapel("comprador"),
    controller.elegibilidade,
  );
  router.post(
    "/avaliacoes",
    autenticarUsuario,
    exigirPapel("comprador"),
    controller.criar,
  );
  return router;
}

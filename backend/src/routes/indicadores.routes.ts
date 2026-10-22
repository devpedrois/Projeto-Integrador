import { Router, type RequestHandler } from "express";
import type { IndicadoresController } from "../controllers/indicadores.controller.js";
import { exigirPapel } from "../middlewares/role.middleware.js";

export function createIndicadoresRouter(
  controller: IndicadoresController,
  autenticarUsuario: RequestHandler,
) {
  const router = Router();
  router.get(
    "/artesao/indicadores",
    autenticarUsuario,
    exigirPapel("artesao"),
    controller.obter,
  );
  return router;
}

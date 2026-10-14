import { Router, type RequestHandler } from "express";
import type { PerfilArtesaoController } from "../controllers/perfil-artesao.controller.js";
import { exigirPapel } from "../middlewares/role.middleware.js";

export function createPerfilArtesaoRouter(
  controller: PerfilArtesaoController,
  autenticarUsuario: RequestHandler,
): Router {
  const router = Router();
  const rota = "/usuarios/:id/perfil-artesao";
  router.use(rota, (_request, response, next) => {
    response.set("Cache-Control", "no-store");
    next();
  });
  router.get(rota, controller.obter);
  router.patch(
    rota,
    autenticarUsuario,
    exigirPapel("artesao"),
    controller.salvar,
  );
  return router;
}

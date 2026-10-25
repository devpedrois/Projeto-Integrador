import { Router, type RequestHandler } from "express";
import type { FotoPerfilController } from "../controllers/foto-perfil.controller.js";
import { receberFotoPerfil } from "../middlewares/foto-perfil.middleware.js";
import { exigirPapel } from "../middlewares/role.middleware.js";

export function createFotoPerfilRouter(
  controller: FotoPerfilController,
  autenticar: RequestHandler,
): Router {
  const router = Router();
  router.post(
    "/artesao/perfil/foto",
    (_request, response, next) => {
      response.set("Cache-Control", "no-store");
      next();
    },
    autenticar,
    exigirPapel("artesao"),
    receberFotoPerfil,
    controller.salvar,
  );
  return router;
}

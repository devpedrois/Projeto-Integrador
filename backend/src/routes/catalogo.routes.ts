import { Router } from "express";
import type { CatalogoController } from "../controllers/catalogo.controller.js";

export function createCatalogoRouter(controller: CatalogoController): Router {
  const router = Router();
  router.use((_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
  });
  router.get("/produtos", controller.listar);
  router.get("/produtos/:id", controller.obter);
  router.get("/categorias", controller.categorias);
  router.get("/tecnicas", controller.tecnicas);
  router.get("/regioes", controller.regioes);
  router.get("/avaliacoes", controller.avaliacoes);
  return router;
}

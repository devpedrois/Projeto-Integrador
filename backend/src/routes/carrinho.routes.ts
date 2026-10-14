import { Router, type RequestHandler } from "express";
import type { CarrinhoController } from "../controllers/carrinho.controller.js";
import { exigirPapel } from "../middlewares/role.middleware.js";

export function createCarrinhoRouter(
  controller: CarrinhoController,
  autenticarUsuario: RequestHandler,
): Router {
  const router = Router();
  router.use("/carrinho", autenticarUsuario, exigirPapel("comprador"));
  router.get("/carrinho", controller.obter);
  router.post("/carrinho/itens", controller.adicionar);
  router.patch("/carrinho/itens/:produtoId", controller.alterar);
  router.delete("/carrinho/itens/:produtoId", controller.remover);
  return router;
}

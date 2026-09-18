import { Router } from "express";
import type { PedidoController } from "../controllers/pedido.controller.js";
import { validateCriarPedido } from "../validators/pedido.validator.js";

export function createPedidoRouter(controller: PedidoController): Router {
  const router = Router();
  router.post("/pedidos", validateCriarPedido, controller.criar);
  return router;
}

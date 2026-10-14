import { Router, type RequestHandler } from "express";
import type { PedidoController } from "../controllers/pedido.controller.js";
import { validateCriarPedido } from "../validators/pedido.validator.js";
import { exigirPapel } from "../middlewares/role.middleware.js";

export function createPedidoRouter(
  controller: PedidoController,
  autenticarUsuario: RequestHandler,
): Router {
  const router = Router();
  router.post(
    "/pedidos",
    autenticarUsuario,
    exigirPapel("comprador"),
    validateCriarPedido,
    controller.criar,
  );
  return router;
}

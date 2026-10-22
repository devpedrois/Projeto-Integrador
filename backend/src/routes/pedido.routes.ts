import { Router, type RequestHandler } from "express";
import type { PedidoController } from "../controllers/pedido.controller.js";
import {
  validateCriarPedido,
  validateListarPedidos,
  validateListarPedidosArtesao,
  validateObterPedido,
} from "../validators/pedido.validator.js";
import { exigirPapel } from "../middlewares/role.middleware.js";

export function createPedidoRouter(
  controller: PedidoController,
  autenticarUsuario: RequestHandler,
): Router {
  const router = Router();
  router.get(
    "/artesao/pedidos",
    autenticarUsuario,
    exigirPapel("artesao"),
    validateListarPedidosArtesao,
    controller.listarRecebidos,
  );
  router.get(
    "/pedidos",
    autenticarUsuario,
    exigirPapel("comprador"),
    validateListarPedidos,
    controller.listarMeus,
  );
  router.get(
    "/pedidos/:id",
    autenticarUsuario,
    exigirPapel("comprador"),
    validateObterPedido,
    controller.obter,
  );
  router.post(
    "/pedidos",
    autenticarUsuario,
    exigirPapel("comprador"),
    validateCriarPedido,
    controller.criar,
  );
  return router;
}

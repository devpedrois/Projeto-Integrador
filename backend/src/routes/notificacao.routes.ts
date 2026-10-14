import { Router, type RequestHandler } from "express";
import type { NotificacaoController } from "../controllers/notificacao.controller.js";
import { exigirPapel } from "../middlewares/role.middleware.js";

export function createNotificacaoRouter(
  controller: NotificacaoController,
  autenticarUsuario: RequestHandler,
) {
  const router = Router();
  router.get(
    "/artesao/notificacoes",
    autenticarUsuario,
    exigirPapel("artesao"),
    controller.listar,
  );
  router.patch(
    "/artesao/notificacoes/:id/lida",
    autenticarUsuario,
    exigirPapel("artesao"),
    controller.marcarComoLida,
  );
  return router;
}

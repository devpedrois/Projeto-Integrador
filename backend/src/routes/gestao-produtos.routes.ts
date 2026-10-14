import { Router, type RequestHandler } from "express";
import type { GestaoProdutosController } from "../controllers/gestao-produtos.controller.js";
import { exigirPapel } from "../middlewares/role.middleware.js";

export function createGestaoProdutosRouter(
  controller: GestaoProdutosController,
  autenticarUsuario: RequestHandler,
) {
  const router = Router();
  router.get(
    "/artesao/produtos",
    autenticarUsuario,
    exigirPapel("artesao"),
    controller.listarMeus,
  );
  router.post(
    "/produtos",
    autenticarUsuario,
    exigirPapel("artesao"),
    controller.criar,
  );
  router.patch(
    "/produtos/:id",
    autenticarUsuario,
    exigirPapel("artesao", "admin"),
    controller.atualizar,
  );
  router.delete(
    "/produtos/:id",
    autenticarUsuario,
    exigirPapel("artesao", "admin"),
    controller.remover,
  );
  router.patch(
    "/produtos/:id/estoque",
    autenticarUsuario,
    exigirPapel("artesao", "admin"),
    controller.estoque,
  );
  router.get(
    "/admin/artesaos",
    exigirPapel("admin"),
    controller.listarArtesaos,
  );
  router.get(
    "/admin/produtos",
    exigirPapel("admin"),
    controller.listarProdutos,
  );
  router.patch(
    "/admin/artesaos/:id/moderar",
    exigirPapel("admin"),
    controller.moderarArtesao,
  );
  router.patch(
    "/admin/produtos/:id/moderar",
    exigirPapel("admin"),
    controller.moderarProduto,
  );
  return router;
}

import { Router, type RequestHandler } from "express";
import type { UsuarioController } from "../controllers/usuario.controller.js";
import { exigirPapel } from "../middlewares/role.middleware.js";
import { validateAlterarPapel } from "../validators/usuario.validator.js";

export function createUsuarioRouter(
  controller: UsuarioController,
  autenticarUsuario: RequestHandler,
): Router {
  const router = Router();
  router.patch(
    "/admin/usuarios/:id/papel",
    autenticarUsuario,
    exigirPapel("admin"),
    validateAlterarPapel,
    controller.alterarPapel,
  );
  return router;
}

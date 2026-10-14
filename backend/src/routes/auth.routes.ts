import cookieParser from "cookie-parser";
import { Router } from "express";
import type { AuthController } from "../controllers/auth.controller.js";
import {
  validateCadastro,
  validateLogin,
} from "../validators/auth.validator.js";

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();
  router.use("/auth", (_request, response, next) => {
    response.set("Cache-Control", "no-store");
    next();
  });
  router.post("/auth/register", validateCadastro, controller.register);
  router.post("/auth/login", validateLogin, controller.login);
  router.post("/auth/logout", controller.logout);
  router.get("/auth/me", cookieParser(), controller.me);
  return router;
}

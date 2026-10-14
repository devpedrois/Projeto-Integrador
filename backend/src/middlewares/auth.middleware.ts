import type { RequestHandler } from "express";
import type { AuthService } from "../services/auth.service.js";
import { lerSessao } from "../utils/token.js";

export function autenticar(
  service: AuthService,
  secret: string | undefined,
): RequestHandler {
  return async (request, response, next): Promise<void> => {
    response.set("Cache-Control", "no-store");
    try {
      const sessao = lerSessao(request, secret);
      response.locals.usuario = await service.me(sessao.sub);
      next();
    } catch (error: unknown) {
      next(error);
    }
  };
}

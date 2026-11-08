import type { RequestHandler } from "express";
import type { AuthService } from "../services/auth.service.js";
import type { UsuarioCriado } from "../repositories/usuario.repository.js";
import { lerSessao, prepararLeitorSessao } from "../utils/token.js";

export function autenticar(
  service: AuthService,
  secret: string | undefined,
): RequestHandler {
  return autenticarCom(
    (id) => service.me(id),
    (request) => lerSessao(request, secret),
  );
}

export function autenticarIdentidade(
  service: AuthService,
  secret: string | undefined,
): RequestHandler {
  return autenticarCom(
    (id) => service.identidade(id),
    prepararLeitorSessao(secret),
  );
}

function autenticarCom(
  carregar: (id: string) => Promise<UsuarioCriado>,
  ler: (request: Parameters<RequestHandler>[0]) => ReturnType<typeof lerSessao>,
): RequestHandler {
  return async (request, response, next): Promise<void> => {
    response.set("Cache-Control", "no-store");
    try {
      const sessao = ler(request);
      response.locals.usuario = await carregar(sessao.sub);
      next();
    } catch (error: unknown) {
      next(error);
    }
  };
}

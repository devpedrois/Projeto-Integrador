import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";
import type { PapelUsuario } from "../generated/prisma/enums.js";

export function exigirPapel(...papeis: PapelUsuario[]): RequestHandler {
  return (_request, response, next): void => {
    const usuario = response.locals.usuario;
    if (usuario === undefined || !papeis.includes(usuario.papel)) {
      next(new AppError(403, "ACESSO_NEGADO", "Acesso negado."));
      return;
    }
    next();
  };
}

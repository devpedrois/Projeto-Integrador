import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error.js";
import type { UsuarioService } from "../services/usuario.service.js";
import type { AlterarPapelInput } from "../validators/usuario.validator.js";

export class UsuarioController {
  public constructor(private readonly service: UsuarioService) {}

  public alterarPapel = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const admin = response.locals.usuario;
      if (admin === undefined) {
        throw new AppError(
          401,
          "NAO_AUTENTICADO",
          "Sessao invalida ou ausente.",
        );
      }
      const input = request.body as AlterarPapelInput;
      const usuarioId = request.params.id as string;
      response
        .status(200)
        .json(
          await this.service.alterarPapel(usuarioId, input.papel, admin.id),
        );
    } catch (error: unknown) {
      next(error);
    }
  };
}

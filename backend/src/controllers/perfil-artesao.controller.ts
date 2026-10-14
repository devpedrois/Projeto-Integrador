import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error.js";
import type { PerfilArtesaoService } from "../services/perfil-artesao.service.js";
import {
  perfilArtesaoParamsSchema,
  perfilArtesaoPatchSchema,
} from "../validators/perfil-artesao.validator.js";

export class PerfilArtesaoController {
  constructor(private readonly service: PerfilArtesaoService) {}
  obter = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    const params = perfilArtesaoParamsSchema.safeParse(request.params);
    if (!params.success) {
      next(new AppError(400, "VALIDACAO", "Artesao invalido."));
      return;
    }
    try {
      response.json(await this.service.obter(params.data.id));
    } catch (error: unknown) {
      next(error);
    }
  };
  salvar = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    const params = perfilArtesaoParamsSchema.safeParse(request.params);
    const input = perfilArtesaoPatchSchema.safeParse(request.body);
    if (!params.success || !input.success) {
      next(new AppError(400, "VALIDACAO", "Dados do perfil invalidos."));
      return;
    }
    try {
      const usuario = response.locals.usuario;
      if (!usuario)
        throw new AppError(
          401,
          "NAO_AUTENTICADO",
          "Sessao invalida ou ausente.",
        );
      response.json(
        await this.service.salvar(params.data.id, input.data, usuario.id),
      );
    } catch (error: unknown) {
      next(error);
    }
  };
}

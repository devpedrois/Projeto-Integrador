import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error.js";
import type { CarrinhoService } from "../services/carrinho.service.js";
import {
  adicionarCarrinhoSchema,
  alterarCarrinhoSchema,
  carrinhoItemParamsSchema,
  carrinhoQuerySchema,
} from "../validators/carrinho.validator.js";

export class CarrinhoController {
  constructor(private readonly service: CarrinhoService) {}
  private usuario(response: Response): string {
    const usuario = response.locals.usuario;
    if (!usuario)
      throw new AppError(401, "NAO_AUTENTICADO", "Sessao invalida ou ausente.");
    return usuario.id;
  }
  obter = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!carrinhoQuerySchema.safeParse(request.query).success)
        throw new AppError(400, "VALIDACAO", "Consulta invalida.");
      response.json(await this.service.obter(this.usuario(response)));
    } catch (error: unknown) {
      next(error);
    }
  };
  adicionar = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const input = adicionarCarrinhoSchema.safeParse(request.body);
      if (
        !input.success ||
        !carrinhoQuerySchema.safeParse(request.query).success
      )
        throw new AppError(400, "VALIDACAO", "Item invalido.");
      response.json(
        await this.service.salvar(
          this.usuario(response),
          input.data.produtoId,
          input.data.quantidade,
          true,
        ),
      );
    } catch (error: unknown) {
      next(error);
    }
  };
  alterar = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const params = carrinhoItemParamsSchema.safeParse(request.params);
      const input = alterarCarrinhoSchema.safeParse(request.body);
      if (
        !params.success ||
        !input.success ||
        !carrinhoQuerySchema.safeParse(request.query).success
      )
        throw new AppError(400, "VALIDACAO", "Item invalido.");
      response.json(
        await this.service.salvar(
          this.usuario(response),
          params.data.produtoId,
          input.data.quantidade,
          false,
        ),
      );
    } catch (error: unknown) {
      next(error);
    }
  };
  remover = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const params = carrinhoItemParamsSchema.safeParse(request.params);
      if (
        !params.success ||
        !carrinhoQuerySchema.safeParse(request.query).success
      )
        throw new AppError(400, "VALIDACAO", "Item invalido.");
      response.json(
        await this.service.remover(
          this.usuario(response),
          params.data.produtoId,
        ),
      );
    } catch (error: unknown) {
      next(error);
    }
  };
}

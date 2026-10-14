import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error.js";
import type { CatalogoService } from "../services/catalogo.service.js";
import { CacheHttp } from "../utils/cache-http.js";
import { chaveCache } from "../utils/cache.js";
import {
  avaliacoesQuerySchema,
  catalogoQuerySchema,
  produtoParamsSchema,
} from "../validators/catalogo.validator.js";

export class CatalogoController {
  constructor(
    private readonly service: CatalogoService,
    private readonly cache = new CacheHttp(),
  ) {}

  listar = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    const query = catalogoQuerySchema.safeParse(request.query);
    if (!query.success) {
      next(new AppError(400, "VALIDACAO", "Filtros invalidos."));
      return;
    }
    try {
      await this.cache.responder(
        response,
        "/produtos",
        chaveCache("produtos:lista", query.data),
        () => this.service.listar(query.data),
      );
    } catch (error: unknown) {
      next(error);
    }
  };

  obter = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    const params = produtoParamsSchema.safeParse(request.params);
    if (!params.success) {
      next(new AppError(400, "VALIDACAO", "Produto invalido."));
      return;
    }
    try {
      await this.cache.responder(
        response,
        "/produtos/:id",
        chaveCache("produtos:detalhe", params.data),
        () => this.service.obter(params.data.id),
      );
    } catch (error: unknown) {
      next(error);
    }
  };

  categorias = async (
    _request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      response.json(await this.service.categorias());
    } catch (error: unknown) {
      next(error);
    }
  };

  tecnicas = async (
    _request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      response.json(await this.service.tecnicas());
    } catch (error: unknown) {
      next(error);
    }
  };

  regioes = async (
    _request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      response.json(await this.service.regioes());
    } catch (error: unknown) {
      next(error);
    }
  };

  avaliacoes = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    const query = avaliacoesQuerySchema.safeParse(request.query);
    if (!query.success) {
      next(new AppError(400, "VALIDACAO", "Produto invalido."));
      return;
    }
    try {
      response.json(await this.service.avaliacoes(query.data.produtoId));
    } catch (error: unknown) {
      next(error);
    }
  };
}

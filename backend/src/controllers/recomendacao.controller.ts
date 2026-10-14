import type { NextFunction, Request, Response } from "express";
import type { RecomendacaoContexto } from "../integrations/recommendation/recomendacao.strategy.js";
import type { RecomendacaoService } from "../services/recomendacao.service.js";
import { CacheHttp } from "../utils/cache-http.js";
import { chaveCache } from "../utils/cache.js";

export class RecomendacaoController {
  public constructor(
    private readonly service: RecomendacaoService,
    private readonly cache = new CacheHttp(),
  ) {}

  public obter = async (
    _request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const contexto = response.locals
        .recomendacaoContexto as RecomendacaoContexto;
      const chave =
        contexto.usuarioId === undefined
          ? chaveCache("recomendacoes:produto", {
              produtoId: contexto.produtoId,
            })
          : undefined;
      await this.cache.responder(response, "/recomendacoes", chave, () =>
        this.service.obter(contexto),
      );
    } catch (error: unknown) {
      next(error);
    }
  };
}

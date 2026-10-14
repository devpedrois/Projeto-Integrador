import type { NextFunction, Request, Response } from "express";
import type { RecomendacaoContexto } from "../integrations/recommendation/recomendacao.strategy.js";
import type { RecomendacaoService } from "../services/recomendacao.service.js";
import { AppError } from "../errors/app-error.js";
import { CacheHttp } from "../utils/cache-http.js";
import { chaveCache } from "../utils/cache.js";

export class RecomendacaoController {
  public constructor(
    private readonly service: RecomendacaoService,
    private readonly pessoal: RecomendacaoService,
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
      const chave = chaveCache("recomendacoes:produto", {
        produtoId: contexto.produtoId,
      });
      await this.cache.responder(response, "/recomendacoes", chave, () =>
        this.service.obter(contexto),
      );
    } catch (error: unknown) {
      next(error);
    }
  };

  public obterParaMim = async (
    _request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      response.set("Cache-Control", "no-store");
      const usuario = response.locals.usuario;
      if (!usuario)
        throw new AppError(401, "NAO_AUTENTICADO", "Sessao invalida.");
      response.json(await this.pessoal.obter({ usuarioId: usuario.id }));
    } catch (error: unknown) {
      next(error);
    }
  };
}

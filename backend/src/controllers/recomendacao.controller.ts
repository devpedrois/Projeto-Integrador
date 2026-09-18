import type { NextFunction, Request, Response } from "express";
import type { RecomendacaoContexto } from "../integrations/recommendation/recomendacao.strategy.js";
import type { RecomendacaoService } from "../services/recomendacao.service.js";

export class RecomendacaoController {
  public constructor(private readonly service: RecomendacaoService) {}

  public obter = async (
    _request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const contexto = response.locals.recomendacaoContexto as RecomendacaoContexto;
      const resultado = await this.service.obter(contexto);
      response.status(200).json(resultado);
    } catch (error: unknown) {
      next(error);
    }
  };
}

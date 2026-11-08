import type { Request, Response } from "express";
import { AppError } from "../errors/app-error.js";
import type { IndicadoresService } from "../services/indicadores.service.js";
import { indicadoresQuerySchema } from "../validators/indicadores.validator.js";
import type { CacheHttp } from "../utils/cache-http.js";
import { chaveIndicadoresArtesao } from "../utils/cache.js";

export class IndicadoresController {
  constructor(
    private readonly service: IndicadoresService,
    private readonly cache: CacheHttp,
  ) {}

  obter = async (request: Request, response: Response) => {
    const usuario = response.locals.usuario;
    if (!usuario)
      throw new AppError(401, "NAO_AUTENTICADO", "Sessao invalida.");
    if (!indicadoresQuerySchema.safeParse(request.query).success)
      throw new AppError(400, "VALIDACAO", "Consulta de indicadores invalida.");
    await this.cache.responder(
      response,
      "/artesao/indicadores",
      chaveIndicadoresArtesao(usuario.id),
      () => this.service.obter(usuario.id),
    );
  };
}

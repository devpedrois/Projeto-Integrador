import type { Request, Response } from "express";
import { AppError } from "../errors/app-error.js";
import type { IndicadoresService } from "../services/indicadores.service.js";
import { indicadoresQuerySchema } from "../validators/indicadores.validator.js";

export class IndicadoresController {
  constructor(private readonly service: IndicadoresService) {}

  obter = async (request: Request, response: Response) => {
    const usuario = response.locals.usuario;
    if (!usuario)
      throw new AppError(401, "NAO_AUTENTICADO", "Sessao invalida.");
    if (!indicadoresQuerySchema.safeParse(request.query).success)
      throw new AppError(400, "VALIDACAO", "Consulta de indicadores invalida.");
    response.set("Cache-Control", "no-store");
    response.json(await this.service.obter(usuario.id));
  };
}

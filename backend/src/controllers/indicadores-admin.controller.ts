import type { Request, Response } from "express";
import { AppError } from "../errors/app-error.js";
import type { IndicadoresAdminService } from "../services/indicadores-admin.service.js";
import { indicadoresAdminQuerySchema } from "../validators/indicadores-admin.validator.js";

export class IndicadoresAdminController {
  constructor(private readonly service: IndicadoresAdminService) {}

  obter = async (request: Request, response: Response) => {
    if (!indicadoresAdminQuerySchema.safeParse(request.query).success)
      throw new AppError(400, "VALIDACAO", "Consulta de indicadores invalida.");
    response.set("Cache-Control", "no-store");
    response.json(await this.service.obter());
  };
}

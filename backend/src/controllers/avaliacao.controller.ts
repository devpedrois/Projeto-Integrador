import type { Request, Response } from "express";
import type { AvaliacaoService } from "../services/avaliacao.service.js";
import { criarAvaliacaoSchema } from "../validators/avaliacao.validator.js";
import { AppError } from "../errors/app-error.js";

export class AvaliacaoController {
  constructor(private readonly service: AvaliacaoService) {}

  criar = async (request: Request, response: Response): Promise<void> => {
    const usuario = response.locals.usuario;
    if (!usuario)
      throw new AppError(401, "NAO_AUTENTICADO", "Sessao invalida ou ausente.");
    const input = criarAvaliacaoSchema.safeParse(request.body);
    if (!input.success)
      throw new AppError(400, "VALIDACAO", "Dados da avaliacao invalidos.");
    response.status(201).json(await this.service.criar(input.data, usuario.id));
  };
}

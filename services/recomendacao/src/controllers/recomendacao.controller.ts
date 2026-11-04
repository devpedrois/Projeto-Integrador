import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import type { Pool } from "pg";
import type { RecomendacaoService } from "../services/recomendacao.service.js";
import { AppError } from "../utils/app-error.js";

const limite = z
  .string()
  .regex(/^[1-8]$/)
  .transform(Number)
  .default(8);
const categoriaQuery = z
  .object({ produtoId: z.uuid().optional(), limite })
  .strict();
const historicoQuery = z.object({ usuarioId: z.uuid(), limite }).strict();

export class RecomendacaoController {
  constructor(
    private readonly service: RecomendacaoService,
    private readonly pool: Pool,
  ) {}
  obter = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = categoriaQuery.safeParse(request.query);
      if (!result.success)
        throw new AppError(
          400,
          "VALIDACAO",
          "Contexto de recomendacao invalido.",
        );
      const { produtoId, limite } = result.data;
      response.json(
        await this.service.obter(
          produtoId === undefined ? {} : { produtoId },
          limite,
        ),
      );
    } catch (error) {
      next(error);
    }
  };
  obterHistorico = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = historicoQuery.safeParse(request.query);
      if (!result.success)
        throw new AppError(
          400,
          "VALIDACAO",
          "Contexto de recomendacao invalido.",
        );
      response
        .set("Cache-Control", "no-store")
        .json(
          await this.service.obter(
            { usuarioId: result.data.usuarioId },
            result.data.limite,
          ),
        );
    } catch (error) {
      next(error);
    }
  };
  health = async (
    _request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await this.pool.query("SELECT 1");
      response.json({ status: "ok" });
    } catch (error) {
      next(error);
    }
  };
}

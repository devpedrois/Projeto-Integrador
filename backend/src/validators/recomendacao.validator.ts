import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";

export const recomendacaoQuerySchema = z
  .object({
    produtoId: z.uuid().optional(),
  })
  .strict();

export const recomendacaoPessoalQuerySchema = z.object({}).strict();

export type RecomendacaoQuery = z.infer<typeof recomendacaoQuerySchema>;

export function validateObterRecomendacoes(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const result = recomendacaoQuerySchema.safeParse(request.query);
  if (!result.success) {
    next(new AppError(400, "VALIDACAO", "Contexto de recomendacao invalido."));
    return;
  }
  response.locals.recomendacaoContexto = result.data;
  next();
}

export function validateObterRecomendacoesPessoais(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  if (!recomendacaoPessoalQuerySchema.safeParse(request.query).success) {
    next(new AppError(400, "VALIDACAO", "Contexto de recomendacao invalido."));
    return;
  }
  next();
}

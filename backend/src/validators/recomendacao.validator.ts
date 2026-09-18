import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";

const recomendacaoQuerySchema = z
  .object({
    produtoId: z.uuid().optional(),
    usuarioId: z.uuid().optional(),
  })
  .strict()
  .refine((data) => (data.produtoId !== undefined) !== (data.usuarioId !== undefined), {
    message: "Informe produtoId ou usuarioId, nunca os dois nem nenhum.",
  });

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

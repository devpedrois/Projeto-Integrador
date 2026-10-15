import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";

export const alterarPapelSchema = z.object({
  id: z.uuid().transform((value) => value.toLowerCase()),
  body: z.strictObject({ papel: z.enum(["comprador", "artesao"]) }),
});

export type AlterarPapelInput = z.infer<typeof alterarPapelSchema>["body"];

export function validateAlterarPapel(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  const result = alterarPapelSchema.safeParse({
    id: request.params.id,
    body: request.body,
  });
  if (!result.success) {
    next(new AppError(400, "VALIDACAO", "Alteracao de papel invalida."));
    return;
  }
  request.params.id = result.data.id;
  request.body = result.data.body;
  next();
}

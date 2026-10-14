import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";

const itemSchema = z.strictObject({
  produtoId: z.uuid().transform((value) => value.toLowerCase()),
  quantidade: z.number().int().positive().max(2_147_483_647),
});

const criarPedidoSchema = z.strictObject({
  itens: z.array(itemSchema).min(1).max(20),
});

export type CriarPedidoInput = z.infer<typeof criarPedidoSchema>;

export function validateCriarPedido(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  const result = criarPedidoSchema.safeParse(request.body);
  if (!result.success) {
    next(new AppError(400, "VALIDACAO", "Pedido invalido."));
    return;
  }
  request.body = result.data;
  next();
}

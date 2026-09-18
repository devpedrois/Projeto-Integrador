import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";

const itemSchema = z.object({
  produtoId: z.uuid().transform((value) => value.toLowerCase()),
  quantidade: z.number().int().positive(),
});

const criarPedidoSchema = z.object({
  compradorRef: z.string().min(1),
  compradorId: z.uuid(),
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

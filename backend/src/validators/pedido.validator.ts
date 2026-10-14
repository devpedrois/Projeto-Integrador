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

const paginacaoPedidoSchema = z.strictObject({
  pagina: z
    .string()
    .regex(/^[1-9]\d*$/)
    .default("1")
    .transform(Number)
    .pipe(z.number().int().max(10_000)),
  limite: z
    .string()
    .regex(/^[1-9]\d*$/)
    .default("10")
    .transform(Number)
    .pipe(z.number().int().max(100)),
});

export type PaginacaoPedidos = z.infer<typeof paginacaoPedidoSchema>;

export function validateListarPedidos(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const result = paginacaoPedidoSchema.safeParse(request.query);
  if (!result.success) {
    next(new AppError(400, "VALIDACAO", "Paginacao invalida."));
    return;
  }
  response.locals.paginacaoPedidos = result.data;
  next();
}

export function validateObterPedido(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const result = z
    .uuid()
    .transform((value) => value.toLowerCase())
    .safeParse(request.params.id);
  if (!result.success) {
    next(new AppError(400, "VALIDACAO", "Identificador de pedido invalido."));
    return;
  }
  response.locals.pedidoId = result.data;
  next();
}

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

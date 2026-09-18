import type { NextFunction, Request, Response } from "express";
import type { PedidoService } from "../services/pedido.service.js";
import type { CriarPedidoInput } from "../validators/pedido.validator.js";

export class PedidoController {
  public constructor(private readonly service: PedidoService) {}

  public criar = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const input = request.body as CriarPedidoInput;
      const resultado = await this.service.criar(input);
      response.status(201).json({
        pedido: { id: resultado.pedidoId, status: "confirmado" },
        itens: resultado.itens,
      });
    } catch (error: unknown) {
      next(error);
    }
  };
}

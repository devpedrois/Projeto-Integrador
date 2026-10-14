import type { NextFunction, Request, Response } from "express";
import type { PedidoService } from "../services/pedido.service.js";
import type { CriarPedidoInput } from "../validators/pedido.validator.js";
import { AppError } from "../errors/app-error.js";

export class PedidoController {
  public constructor(private readonly service: PedidoService) {}

  public criar = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const usuario = response.locals.usuario;
      if (usuario === undefined) {
        throw new AppError(
          401,
          "NAO_AUTENTICADO",
          "Sessao invalida ou ausente.",
        );
      }
      const input = request.body as CriarPedidoInput;
      const resultado = await this.service.criar(input, usuario.id);
      response.status(201).json({
        pedido: {
          id: resultado.pedidoId,
          compradorId: resultado.compradorId,
          numero: resultado.numero,
          total: resultado.total,
          status: resultado.status,
          criadoEm: resultado.criadoEm,
        },
        itens: resultado.itens,
      });
    } catch (error: unknown) {
      next(error);
    }
  };
}

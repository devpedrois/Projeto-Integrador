import type { NextFunction, Request, Response } from "express";
import type { PedidoService } from "../services/pedido.service.js";
import type { CriarPedidoInput } from "../validators/pedido.validator.js";
import type { PaginacaoPedidos } from "../validators/pedido.validator.js";
import type { PaginacaoPedidosArtesao } from "../validators/pedido.validator.js";
import { AppError } from "../errors/app-error.js";

export class PedidoController {
  public constructor(private readonly service: PedidoService) {}

  public enviarItem = async (
    _request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const usuario = response.locals.usuario;
      if (!usuario)
        throw new AppError(
          401,
          "NAO_AUTENTICADO",
          "Sessao invalida ou ausente.",
        );
      response.json(
        await this.service.enviarItem(
          response.locals.itemPedidoId as string,
          usuario.id,
        ),
      );
    } catch (error: unknown) {
      next(error);
    }
  };

  public listarRecebidos = async (
    _request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const usuario = response.locals.usuario;
      if (!usuario)
        throw new AppError(
          401,
          "NAO_AUTENTICADO",
          "Sessao invalida ou ausente.",
        );
      response.json(
        await this.service.listarRecebidos(
          usuario.id,
          response.locals.paginacaoPedidosArtesao as PaginacaoPedidosArtesao,
        ),
      );
    } catch (error: unknown) {
      next(error);
    }
  };

  public listarMeus = async (
    _request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const usuario = response.locals.usuario;
      if (!usuario)
        throw new AppError(
          401,
          "NAO_AUTENTICADO",
          "Sessao invalida ou ausente.",
        );
      response.json(
        await this.service.listarMeus(
          usuario.id,
          response.locals.paginacaoPedidos as PaginacaoPedidos,
        ),
      );
    } catch (error: unknown) {
      next(error);
    }
  };

  public obter = async (
    _request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const usuario = response.locals.usuario;
      if (!usuario)
        throw new AppError(
          401,
          "NAO_AUTENTICADO",
          "Sessao invalida ou ausente.",
        );
      const { itens, pagamento, ...pedido } = await this.service.obter(
        response.locals.pedidoId as string,
        usuario.id,
      );
      response.json({ pedido, itens, pagamento });
    } catch (error: unknown) {
      next(error);
    }
  };

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

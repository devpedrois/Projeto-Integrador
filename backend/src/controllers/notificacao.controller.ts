import type { Request, Response } from "express";
import { AppError } from "../errors/app-error.js";
import type { NotificacaoService } from "../services/notificacao.service.js";
import { notificacaoParamsSchema } from "../validators/notificacao.validator.js";

function usuarioId(response: Response): string {
  const usuario = response.locals.usuario;
  if (!usuario) throw new AppError(401, "NAO_AUTENTICADO", "Sessao invalida.");
  return usuario.id;
}

export class NotificacaoController {
  constructor(private readonly service: NotificacaoService) {}

  listar = async (_request: Request, response: Response) => {
    response.set("Cache-Control", "no-store");
    response.json(await this.service.listar(usuarioId(response)));
  };

  marcarComoLida = async (request: Request, response: Response) => {
    const params = notificacaoParamsSchema.safeParse(request.params);
    if (!params.success)
      throw new AppError(400, "VALIDACAO", "Identificador invalido.");
    await this.service.marcarComoLida(params.data.id, usuarioId(response));
    response.set("Cache-Control", "no-store").status(204).end();
  };
}

import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";
import type { FotoPerfilService } from "../services/foto-perfil.service.js";

export class FotoPerfilController {
  constructor(private readonly service: FotoPerfilService) {}

  salvar: RequestHandler = async (request, response, next) => {
    try {
      const usuario = response.locals.usuario;
      if (!usuario || !request.file) {
        next(new AppError(400, "FOTO_INVALIDA", "Foto ou sessao invalida."));
        return;
      }
      response.json(
        await this.service.salvar(
          usuario.id,
          request.file.buffer,
          request.file.mimetype,
        ),
      );
    } catch {
      next(
        new AppError(
          503,
          "FOTO_INDISPONIVEL",
          "Nao foi possivel salvar a foto. Tente novamente.",
        ),
      );
    }
  };
}

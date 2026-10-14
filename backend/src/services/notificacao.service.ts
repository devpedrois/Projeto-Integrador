import { AppError } from "../errors/app-error.js";
import type { NotificacaoRepository } from "../repositories/notificacao.repository.js";

export class NotificacaoService {
  constructor(private readonly repository: NotificacaoRepository) {}

  listar(usuarioId: string) {
    return this.repository.listarDoUsuario(usuarioId);
  }

  async marcarComoLida(id: string, usuarioId: string): Promise<void> {
    if (!(await this.repository.marcarComoLida(id, usuarioId))) {
      throw new AppError(404, "NAO_ENCONTRADO", "Notificacao nao encontrada.");
    }
  }
}

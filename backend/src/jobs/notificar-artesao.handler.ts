import type { IntencaoNotificacaoRepository } from "../repositories/intencao-notificacao.repository.js";
import type { NotificacaoRepository } from "../repositories/notificacao.repository.js";

export interface NotificarArtesaoJobData {
  intencaoId: string;
  pedidoId: string;
}

export async function notificarArtesao(
  repository: IntencaoNotificacaoRepository,
  data: NotificarArtesaoJobData,
  notificacaoRepository: NotificacaoRepository,
): Promise<void> {
  const artesaos = await notificacaoRepository.listarArtesaosDoPedido(
    data.pedidoId,
  );
  for (const usuarioId of artesaos) {
    await notificacaoRepository.registrarSeAusente({
      usuarioId,
      pedidoId: data.pedidoId,
      tipo: "novo_pedido",
    });
  }
  await repository.marcarComoProcessada(data.intencaoId);
}

import type { IntencaoNotificacaoRepository } from "../repositories/intencao-notificacao.repository.js";

export interface NotificarArtesaoJobData {
  intencaoId: string;
  pedidoId: string;
}

export async function notificarArtesao(
  repository: IntencaoNotificacaoRepository,
  data: NotificarArtesaoJobData,
): Promise<void> {
  await repository.marcarComoProcessada(data.intencaoId);
}

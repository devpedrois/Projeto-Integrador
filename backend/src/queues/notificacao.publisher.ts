import type { PgBoss } from "pg-boss";
import type {
  IntencaoNotificacaoRepository,
  IntencaoPendente,
} from "../repositories/intencao-notificacao.repository.js";
import { NOTIFICAR_ARTESAO_QUEUE, NOTIFICAR_ARTESAO_RETRY_LIMIT } from "./pg-boss.client.js";

export interface IntencaoPublicada {
  intencaoId: string;
  pedidoId: string;
  jobId: string;
}

export async function publicarIntencao(
  boss: PgBoss,
  repository: IntencaoNotificacaoRepository,
  intencao: IntencaoPendente,
): Promise<IntencaoPublicada | null> {
  const jobId = await boss.send(
    NOTIFICAR_ARTESAO_QUEUE,
    { intencaoId: intencao.id, pedidoId: intencao.pedidoId },
    { retryLimit: NOTIFICAR_ARTESAO_RETRY_LIMIT, retryBackoff: true },
  );

  if (jobId === null) {
    return null;
  }

  const publicada = await repository.marcarComoPublicada(intencao.id);
  if (!publicada) {
    return null;
  }

  return { intencaoId: intencao.id, pedidoId: intencao.pedidoId, jobId };
}

export async function publicarIntencoesPendentes(
  boss: PgBoss,
  repository: IntencaoNotificacaoRepository,
): Promise<IntencaoPublicada[]> {
  const pendentes = await repository.listarPendentesOuFalha();
  const publicadas: IntencaoPublicada[] = [];

  for (const intencao of pendentes) {
    const resultado = await publicarIntencao(boss, repository, intencao);
    if (resultado !== null) {
      publicadas.push(resultado);
    }
  }

  return publicadas;
}

import type { PgBoss, WorkOptions } from "pg-boss";
import type { IntencaoNotificacaoRepository } from "../repositories/intencao-notificacao.repository.js";
import type { NotificacaoRepository } from "../repositories/notificacao.repository.js";
import { NOTIFICAR_ARTESAO_QUEUE } from "../queues/pg-boss.client.js";
import {
  notificarArtesao,
  type NotificarArtesaoJobData,
} from "./notificar-artesao.handler.js";

export function registerNotificarArtesaoWorker(
  boss: PgBoss,
  repository: IntencaoNotificacaoRepository,
  notificacaoRepository: NotificacaoRepository,
  options: Partial<WorkOptions> = {},
  latenciaMs = 0,
): Promise<string> {
  return boss.work<
    NotificarArtesaoJobData,
    unknown,
    WorkOptions & { includeMetadata: true }
  >(
    NOTIFICAR_ARTESAO_QUEUE,
    { ...options, includeMetadata: true },
    async (jobs) => {
      const job = jobs[0];
      if (job === undefined) {
        return;
      }
      let resultado: "sucesso" | "erro" = "erro";
      try {
        await repository.registrarTentativa(job.data.intencaoId);
        await notificarArtesao(
          repository,
          job.data,
          notificacaoRepository,
          latenciaMs,
        );
        resultado = "sucesso";
      } finally {
        console.info(
          JSON.stringify({
            servico: "worker",
            job: NOTIFICAR_ARTESAO_QUEUE,
            pedidoId: job.data.pedidoId,
            tentativa: job.retryCount + 1,
            resultado,
          }),
        );
      }
    },
  );
}

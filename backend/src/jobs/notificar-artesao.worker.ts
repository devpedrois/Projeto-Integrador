import type { PgBoss, WorkOptions } from "pg-boss";
import type { IntencaoNotificacaoRepository } from "../repositories/intencao-notificacao.repository.js";
import { NOTIFICAR_ARTESAO_QUEUE } from "../queues/pg-boss.client.js";
import { notificarArtesao, type NotificarArtesaoJobData } from "./notificar-artesao.handler.js";

export function registerNotificarArtesaoWorker(
  boss: PgBoss,
  repository: IntencaoNotificacaoRepository,
  options: Partial<WorkOptions> = {},
): Promise<string> {
  return boss.work<NotificarArtesaoJobData>(
    NOTIFICAR_ARTESAO_QUEUE,
    options as WorkOptions,
    async (jobs) => {
      const job = jobs[0];
      if (job === undefined) {
        return;
      }
      await repository.registrarTentativa(job.data.intencaoId);
      await notificarArtesao(repository, job.data);
    },
  );
}

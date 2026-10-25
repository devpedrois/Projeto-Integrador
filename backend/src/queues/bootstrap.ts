import type { PgBoss } from "pg-boss";
import type { PrismaClient } from "../generated/prisma/client.js";
import { registerNotificarArtesaoWorker } from "../jobs/notificar-artesao.worker.js";
import { PrismaIntencaoNotificacaoRepository } from "../repositories/intencao-notificacao.repository.js";
import { PrismaNotificacaoRepository } from "../repositories/notificacao.repository.js";
import { publicarIntencoesPendentes } from "./notificacao.publisher.js";
import { ensureNotificarArtesaoQueue } from "./pg-boss.client.js";

export interface QueueInfrastructure {
  prisma: PrismaClient;
  boss: PgBoss;
}

export async function iniciarPublicador(
  boss: PgBoss,
  prisma: PrismaClient,
  intervaloMs: number,
) {
  await boss.start();
  await ensureNotificarArtesaoQueue(boss);
  const repository = new PrismaIntencaoNotificacaoRepository(prisma);
  let publicacao: Promise<void> | undefined;
  const intervalo = setInterval(() => {
    if (publicacao !== undefined) return;
    publicacao = publicarIntencoesPendentes(boss, repository)
      .then(() => undefined)
      .catch(() => {
        process.stderr.write(
          "Failed to publish pending notification intentions\n",
        );
      })
      .finally(() => {
        publicacao = undefined;
      });
  }, intervaloMs);

  return async function pararPublicador(): Promise<void> {
    clearInterval(intervalo);
    await publicacao;
  };
}

export async function iniciarConsumidor(
  boss: PgBoss,
  prisma: PrismaClient,
  options: { latenciaMs?: number; concorrencia?: number } = {},
) {
  await boss.start();
  await ensureNotificarArtesaoQueue(boss);
  return registerNotificarArtesaoWorker(
    boss,
    new PrismaIntencaoNotificacaoRepository(prisma),
    new PrismaNotificacaoRepository(prisma),
    { pollingIntervalSeconds: 1, localConcurrency: options.concorrencia ?? 1 },
    options.latenciaMs ?? 0,
  );
}

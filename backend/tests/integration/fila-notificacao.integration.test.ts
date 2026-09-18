import { randomUUID } from "node:crypto";
import "dotenv/config";
import type { PgBoss } from "pg-boss";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "../../src/database/prisma/client.js";
import { StatusIntencao } from "../../src/generated/prisma/enums.js";
import { notificarArtesao } from "../../src/jobs/notificar-artesao.handler.js";
import type { NotificarArtesaoJobData } from "../../src/jobs/notificar-artesao.handler.js";
import { registerNotificarArtesaoWorker } from "../../src/jobs/notificar-artesao.worker.js";
import {
  createPgBossClient,
  NOTIFICAR_ARTESAO_QUEUE,
  ensureNotificarArtesaoQueue,
} from "../../src/queues/pg-boss.client.js";
import { publicarIntencoesPendentes } from "../../src/queues/notificacao.publisher.js";
import { PrismaIntencaoNotificacaoRepository } from "../../src/repositories/intencao-notificacao.repository.js";
import { PrismaPedidoRepository } from "../../src/repositories/pedido.repository.js";
import { databasePool } from "../helpers/database.js";
import {
  criarCategoria,
  criarUsuarioArtesao,
  criarUsuarioComprador,
} from "../helpers/dominio-fixtures.js";

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error("DATABASE_URL is required for integration tests");
}

const prisma = createPrismaClient(databaseUrl);
const repository = new PrismaIntencaoNotificacaoRepository(prisma);
const pedidoRepository = new PrismaPedidoRepository(prisma);

let boss: PgBoss;

let artesaoId: string;
let categoriaId: string;
let compradorId: string;

const createdProdutoIds: string[] = [];
const createdPedidoIds: string[] = [];
const extraBosses: PgBoss[] = [];

async function createProduto(quantidadeEstoque: number): Promise<string> {
  const id = randomUUID();
  await prisma.produto.create({
    data: { id, nome: "Produto de teste", artesaoId, categoriaId, quantidadeEstoque },
  });
  createdProdutoIds.push(id);
  return id;
}

async function createPedidoComIntencao(quantidadeEstoque = 5): Promise<{
  pedidoId: string;
  intencaoId: string;
}> {
  const produtoId = await createProduto(quantidadeEstoque);
  const pedido = await pedidoRepository.criar({
    compradorRef: "comprador-sintetico-fila",
    compradorId,
    itens: [{ produtoId, quantidade: 1 }],
  });
  createdPedidoIds.push(pedido.pedidoId);

  const intencao = await prisma.intencaoNotificacao.findUniqueOrThrow({
    where: { pedidoId: pedido.pedidoId },
  });

  return { pedidoId: pedido.pedidoId, intencaoId: intencao.id };
}

async function fetchIntencao(pedidoId: string) {
  return prisma.intencaoNotificacao.findUniqueOrThrow({ where: { pedidoId } });
}

async function waitFor<T>(
  check: () => Promise<T | undefined>,
  timeoutMs = 10_000,
  intervalMs = 150,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const result = await check();
    if (result !== undefined) {
      return result;
    }
    if (Date.now() > deadline) {
      throw new Error("timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

async function waitForStatus(pedidoId: string, status: StatusIntencao) {
  return waitFor(async () => {
    const intencao = await fetchIntencao(pedidoId);
    return intencao.status === status ? intencao : undefined;
  });
}

const FAST_POLLING = { pollingIntervalSeconds: 0.5 };

beforeAll(async () => {
  boss = createPgBossClient(databaseUrl);
  await boss.start();
  await ensureNotificarArtesaoQueue(boss);
  artesaoId = await criarUsuarioArtesao(databasePool);
  categoriaId = await criarCategoria(databasePool);
  compradorId = await criarUsuarioComprador(databasePool);
});

afterEach(async () => {
  for (const extraBoss of extraBosses.splice(0)) {
    await extraBoss.stop({ graceful: false });
  }
  await boss.offWork(NOTIFICAR_ARTESAO_QUEUE);
  await prisma.intencaoNotificacao.deleteMany({
    where: { pedidoId: { in: createdPedidoIds } },
  });
  await prisma.itemPedido.deleteMany({ where: { pedidoId: { in: createdPedidoIds } } });
  await prisma.pedido.deleteMany({ where: { id: { in: createdPedidoIds } } });
  if (createdProdutoIds.length > 0) {
    await prisma.produto.deleteMany({ where: { id: { in: createdProdutoIds } } });
  }
  createdPedidoIds.length = 0;
  createdProdutoIds.length = 0;
});

afterAll(async () => {
  await boss.stop({ graceful: false });
  await databasePool.query('DELETE FROM "Usuario" WHERE "id" = ANY($1)', [
    [artesaoId, compradorId],
  ]);
  await databasePool.query('DELETE FROM "Categoria" WHERE "id" = $1', [categoriaId]);
  await prisma.$disconnect();
  await databasePool.end();
});

describe("fila de notificacao ao artesao", () => {
  it("creates a pending IntencaoNotificacao in the same transaction as the order", async () => {
    const { pedidoId } = await createPedidoComIntencao();

    const intencao = await fetchIntencao(pedidoId);

    expect(intencao.pedidoId).toBe(pedidoId);
    expect(intencao.status).toBe(StatusIntencao.pendente);
    expect(intencao.tentativas).toBe(0);
    expect(intencao.processadaEm).toBeNull();
  });

  it("publishes a pending intention and the worker processes it to processada", async () => {
    const { pedidoId, intencaoId } = await createPedidoComIntencao();

    const publicadas = await publicarIntencoesPendentes(boss, repository);
    expect(publicadas.some((item) => item.intencaoId === intencaoId)).toBe(true);

    const publicada = await fetchIntencao(pedidoId);
    expect(publicada.status).toBe(StatusIntencao.publicada);

    await registerNotificarArtesaoWorker(boss, repository, FAST_POLLING);

    const processada = await waitForStatus(pedidoId, StatusIntencao.processada);
    expect(processada.processadaEm).not.toBeNull();
  }, 15_000);

  it("retries after a simulated worker failure and still reaches processada, keeping the order confirmed", async () => {
    const { pedidoId, intencaoId } = await createPedidoComIntencao();
    await publicarIntencoesPendentes(boss, repository);

    let attempts = 0;
    await boss.work<NotificarArtesaoJobData>(NOTIFICAR_ARTESAO_QUEUE, FAST_POLLING, async (jobs) => {
      const job = jobs[0];
      if (job === undefined) {
        return;
      }
      await repository.registrarTentativa(job.data.intencaoId);
      attempts += 1;
      if (attempts === 1) {
        throw new Error("falha simulada de worker");
      }
      await notificarArtesao(repository, job.data);
    });

    await waitForStatus(pedidoId, StatusIntencao.processada);

    expect(attempts).toBe(2);
    const intencao = await fetchIntencao(pedidoId);
    expect(intencao.tentativas).toBe(2);

    const pedido = await prisma.pedido.findUniqueOrThrow({ where: { id: pedidoId } });
    expect(pedido.id).toBe(pedidoId);
    expect(intencaoId).toBe(intencao.id);
  }, 15_000);

  it("recovers a pending intention after a simulated restart", async () => {
    const { pedidoId } = await createPedidoComIntencao();

    const restartedBoss = createPgBossClient(databaseUrl);
    extraBosses.push(restartedBoss);
    await restartedBoss.start();
    await ensureNotificarArtesaoQueue(restartedBoss);

    await publicarIntencoesPendentes(restartedBoss, repository);
    await registerNotificarArtesaoWorker(restartedBoss, repository, FAST_POLLING);

    const processada = await waitForStatus(pedidoId, StatusIntencao.processada);
    expect(processada.processadaEm).not.toBeNull();
  }, 15_000);

  it("keeps a single effect on duplicate redelivery of the same job data", async () => {
    const { pedidoId, intencaoId } = await createPedidoComIntencao();
    const data: NotificarArtesaoJobData = { intencaoId, pedidoId };

    await notificarArtesao(repository, data);
    const firstResult = await fetchIntencao(pedidoId);
    expect(firstResult.status).toBe(StatusIntencao.processada);
    expect(firstResult.processadaEm).not.toBeNull();

    await notificarArtesao(repository, data);
    const secondResult = await fetchIntencao(pedidoId);
    expect(secondResult.processadaEm?.toISOString()).toBe(
      firstResult.processadaEm?.toISOString(),
    );

    const count = await prisma.intencaoNotificacao.count({ where: { pedidoId } });
    expect(count).toBe(1);
  });

  it("preserves the original processadaEm under concurrent redelivery", async () => {
    const { pedidoId, intencaoId } = await createPedidoComIntencao();
    const data: NotificarArtesaoJobData = { intencaoId, pedidoId };

    await Promise.all([notificarArtesao(repository, data), notificarArtesao(repository, data)]);

    const afterConcurrent = await fetchIntencao(pedidoId);
    expect(afterConcurrent.status).toBe(StatusIntencao.processada);
    expect(afterConcurrent.processadaEm).not.toBeNull();

    await notificarArtesao(repository, data);
    const afterLateRedelivery = await fetchIntencao(pedidoId);
    expect(afterLateRedelivery.processadaEm?.toISOString()).toBe(
      afterConcurrent.processadaEm?.toISOString(),
    );
  });

  it("does not regress processada back to publicada when the publisher revisits it", async () => {
    const { pedidoId, intencaoId } = await createPedidoComIntencao();

    await notificarArtesao(repository, { intencaoId, pedidoId });
    const processada = await fetchIntencao(pedidoId);
    expect(processada.status).toBe(StatusIntencao.processada);

    const atualizou = await repository.marcarComoPublicada(intencaoId);
    expect(atualizou).toBe(false);

    const inalterada = await fetchIntencao(pedidoId);
    expect(inalterada.status).toBe(StatusIntencao.processada);
  });
});

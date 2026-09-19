import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { StatusIntencao } from "../../src/generated/prisma/enums.js";
import { NOTIFICAR_ARTESAO_QUEUE } from "../../src/queues/pg-boss.client.js";
import { startServer } from "../../src/server.js";
import { databasePool } from "../helpers/database.js";
import {
  criarCategoria,
  criarProduto,
  criarUsuarioArtesao,
  criarUsuarioComprador,
} from "../helpers/dominio-fixtures.js";

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

const createdUsuarioIds: string[] = [];
const createdCategoriaIds: string[] = [];

afterAll(async () => {
  if (createdUsuarioIds.length > 0) {
    await databasePool.query('DELETE FROM "Usuario" WHERE "id" = ANY($1)', [createdUsuarioIds]);
  }
  if (createdCategoriaIds.length > 0) {
    await databasePool.query('DELETE FROM "Categoria" WHERE "id" = ANY($1)', [createdCategoriaIds]);
  }
});

describe("startServer bootstraps the notification queue", () => {
  it("accepts and processes a job right after the backend boots, without a manual worker registration", async () => {
    const { server, prisma, boss } = await startServer({
      ...process.env,
      PORT: "3111",
    });

    try {
      const artesaoId = await criarUsuarioArtesao(databasePool);
      const compradorId = await criarUsuarioComprador(databasePool);
      const categoriaId = await criarCategoria(databasePool);
      createdUsuarioIds.push(artesaoId, compradorId);
      createdCategoriaIds.push(categoriaId);

      const produtoId = await criarProduto(databasePool, { artesaoId, categoriaId });
      const pedidoId = crypto.randomUUID();

      try {
        await prisma.pedido.create({
          data: { id: pedidoId, compradorRef: "comprador-sintetico-bootstrap", compradorId },
        });
        const intencao = await prisma.intencaoNotificacao.create({
          data: { id: crypto.randomUUID(), pedidoId },
        });

        await boss.send(NOTIFICAR_ARTESAO_QUEUE, {
          intencaoId: intencao.id,
          pedidoId,
        });

        const processada = await waitFor(async () => {
          const atual = await prisma.intencaoNotificacao.findUniqueOrThrow({
            where: { id: intencao.id },
          });
          return atual.status === StatusIntencao.processada ? atual : undefined;
        });
        expect(processada.processadaEm).not.toBeNull();
      } finally {
        await prisma.intencaoNotificacao.deleteMany({ where: { pedidoId } });
        await prisma.itemPedido.deleteMany({ where: { pedidoId } });
        await prisma.pedido.deleteMany({ where: { id: pedidoId } });
        await prisma.produto.delete({ where: { id: produtoId } });
      }
    } finally {
      if (boss !== undefined) {
        await boss.stop({ graceful: false });
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.$disconnect();
    }
  }, 20_000);
});

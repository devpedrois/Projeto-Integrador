import "dotenv/config";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { StatusIntencao } from "../../src/generated/prisma/enums.js";
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
  timeoutMs = 15_000,
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

describe("auto-publish of pending notification intentions", () => {
  it("moves a real POST /pedidos intention from pendente to processada without manual queue calls", async () => {
    const { server, prisma, boss } = await startServer({
      ...process.env,
      PORT: "3112",
      NOTIFICATION_PUBLISHER_INTERVAL_MS: "1000",
    });

    try {
      const artesaoId = await criarUsuarioArtesao(databasePool);
      const compradorId = await criarUsuarioComprador(databasePool);
      const categoriaId = await criarCategoria(databasePool);
      createdUsuarioIds.push(artesaoId, compradorId);
      createdCategoriaIds.push(categoriaId);

      const produtoId = await criarProduto(databasePool, { artesaoId, categoriaId });

      try {
        const response = await request(server)
          .post("/pedidos")
          .send({
            compradorRef: "comprador-sintetico-auto-publish",
            compradorId,
            itens: [{ produtoId, quantidade: 1 }],
          });

        expect(response.status).toBe(201);
        const pedidoId = response.body.pedido.id as string;

        try {
          const processada = await waitFor(async () => {
            const atual = await prisma.intencaoNotificacao.findUniqueOrThrow({
              where: { pedidoId },
            });
            return atual.status === StatusIntencao.processada ? atual : undefined;
          });
          expect(processada.processadaEm).not.toBeNull();
        } finally {
          await prisma.intencaoNotificacao.deleteMany({ where: { pedidoId } });
          await prisma.pagamento.deleteMany({ where: { pedidoId } });
          await prisma.itemPedido.deleteMany({ where: { pedidoId } });
          await prisma.pedido.deleteMany({ where: { id: pedidoId } });
        }
      } finally {
        await prisma.produto.delete({ where: { id: produtoId } });
      }
    } finally {
      if (boss !== undefined) {
        await boss.stop({ graceful: false });
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.$disconnect();
    }
  }, 25_000);
});

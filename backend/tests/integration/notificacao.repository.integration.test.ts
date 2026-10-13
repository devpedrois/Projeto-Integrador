import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import type { Prisma } from "../../src/generated/prisma/client.js";
import { createPrismaClient } from "../../src/database/prisma/client.js";
import { PrismaNotificacaoRepository } from "../../src/repositories/notificacao.repository.js";

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error("DATABASE_URL is required for integration tests");
}
const prisma = createPrismaClient(databaseUrl);

afterAll(async () => {
  await prisma.$disconnect();
});

async function comRollback(
  verificar: (tx: Prisma.TransactionClient) => Promise<void>,
): Promise<void> {
  const rollback = new Error("Rollback dos dados sinteticos da BD-06");
  try {
    await prisma.$transaction(async (tx) => {
      await verificar(tx);
      throw rollback;
    }, { timeout: 10000 });
  } catch (error: unknown) {
    if (error !== rollback) throw error;
  }
}

async function criarDados(tx: Prisma.TransactionClient) {
  const comprador = await tx.usuario.create({
    data: {
      nome: "Comprador sintetico BD-06",
      email: `bd06-comprador-${randomUUID()}@teste.origem`,
      senhaHash: "hash-sintetico-bd06",
      papel: "comprador",
    },
  });
  const usuario = await tx.usuario.create({
    data: {
      nome: "Usuario sintetico BD-06",
      email: `bd06-${randomUUID()}@teste.origem`,
      senhaHash: "hash-sintetico-bd06",
      papel: "artesao",
    },
  });
  const pedido = await tx.pedido.create({
    data: { compradorId: comprador.id },
  });
  return { usuarioId: usuario.id, pedidoId: pedido.id, tipo: "novo_pedido" as const };
}

describe("BD-06: PrismaNotificacaoRepository", () => {
  it("dois registros iguais resultam em uma linha", async () => {
    await comRollback(async (tx) => {
      const dados = await criarDados(tx);
      const repository = new PrismaNotificacaoRepository(tx);
      await expect(repository.registrarSeAusente(dados)).resolves.toBe(true);
      await expect(repository.registrarSeAusente(dados)).resolves.toBe(false);
      await expect(tx.notificacao.count({ where: dados })).resolves.toBe(1);
      const registro = await tx.notificacao.findFirstOrThrow({ where: dados });
      expect(registro.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(registro.lida).toBe(false);
      expect(registro.criadoEm).toBeInstanceOf(Date);
    });
  });

  it("reentrega preserva estado lido, ID e data originais", async () => {
    await comRollback(async (tx) => {
      const dados = await criarDados(tx);
      const repository = new PrismaNotificacaoRepository(tx);
      await repository.registrarSeAusente(dados);
      const original = await tx.notificacao.findFirstOrThrow({ where: dados });
      await tx.notificacao.update({ where: { id: original.id }, data: { lida: true } });
      await expect(repository.registrarSeAusente(dados)).resolves.toBe(false);
      const atual = await tx.notificacao.findUniqueOrThrow({ where: { id: original.id } });
      expect(atual.lida).toBe(true);
      expect(atual.criadoEm).toEqual(original.criadoEm);
      await expect(tx.notificacao.count({ where: dados })).resolves.toBe(1);
    });
  });

  it("pedidos distintos produzem notificacoes distintas", async () => {
    await comRollback(async (tx) => {
      const dados = await criarDados(tx);
      const original = await tx.pedido.findUniqueOrThrow({ where: { id: dados.pedidoId } });
      const outroPedido = await tx.pedido.create({ data: { compradorId: original.compradorId } });
      const repository = new PrismaNotificacaoRepository(tx);
      await repository.registrarSeAusente(dados);
      await repository.registrarSeAusente({ ...dados, pedidoId: outroPedido.id });
      await expect(tx.notificacao.count({ where: { usuarioId: dados.usuarioId } })).resolves.toBe(2);
    });
  });

  it.each(["usuarioId", "pedidoId"] as const)("rejeita %s inexistente", async (campo) => {
    await comRollback(async (tx) => {
      const dados = await criarDados(tx);
      const repository = new PrismaNotificacaoRepository(tx);
      await expect(repository.registrarSeAusente({ ...dados, [campo]: randomUUID() }))
        .rejects.toMatchObject({ code: "P2003" });
    });
  });
});

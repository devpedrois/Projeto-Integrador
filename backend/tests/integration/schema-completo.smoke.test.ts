import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "../../src/database/prisma/client.js";

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error("DATABASE_URL is required for integration tests");
}

const prisma = createPrismaClient(databaseUrl);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("schema completo: smoke test com Prisma real", () => {
  it("consulta as onze entidades de dominio sem erro", async () => {
    await expect(prisma.usuario.count()).resolves.toBeGreaterThanOrEqual(0);
    await expect(prisma.perfilArtesao.count()).resolves.toBeGreaterThanOrEqual(0);
    await expect(prisma.categoria.count()).resolves.toBeGreaterThanOrEqual(0);
    await expect(prisma.produto.count()).resolves.toBeGreaterThanOrEqual(0);
    await expect(prisma.produtoFoto.count()).resolves.toBeGreaterThanOrEqual(0);
    await expect(prisma.carrinho.count()).resolves.toBeGreaterThanOrEqual(0);
    await expect(prisma.itemCarrinho.count()).resolves.toBeGreaterThanOrEqual(0);
    await expect(prisma.pedido.count()).resolves.toBeGreaterThanOrEqual(0);
    await expect(prisma.itemPedido.count()).resolves.toBeGreaterThanOrEqual(0);
    await expect(prisma.pagamento.count()).resolves.toBeGreaterThanOrEqual(0);
    await expect(prisma.avaliacao.count()).resolves.toBeGreaterThanOrEqual(0);
  });

  it("consulta a estrutura tecnica de fila sem erro", async () => {
    await expect(prisma.intencaoNotificacao.count()).resolves.toBeGreaterThanOrEqual(0);
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runSeed, seedIds } from "../../prisma/seed.js";
import { createPrismaClient } from "../../src/database/prisma/client.js";

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error("DATABASE_URL is required for integration tests");
}

const prisma = createPrismaClient(databaseUrl);

beforeAll(async () => {
  await runSeed(prisma);
  await runSeed(prisma);
}, 60000);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("database seed: carga sintetica representativa", () => {
  it("mantem contagens estaveis apos execucao repetida (idempotencia)", async () => {
    await expect(prisma.categoria.count()).resolves.toBe(6);
    await expect(prisma.usuario.count()).resolves.toBe(5);
    await expect(prisma.perfilArtesao.count()).resolves.toBe(2);
    await expect(prisma.carrinho.count()).resolves.toBe(1);
    await expect(prisma.itemCarrinho.count()).resolves.toBe(1);
    await expect(prisma.produto.count()).resolves.toBe(9);
    await expect(prisma.produtoFoto.count()).resolves.toBe(10);
    await expect(prisma.pedido.count()).resolves.toBe(3);
    await expect(prisma.itemPedido.count()).resolves.toBe(6);
    await expect(prisma.pagamento.count()).resolves.toBe(3);
    await expect(prisma.avaliacao.count()).resolves.toBe(4);
  });

  it("distribui produtos pelas seis categorias oficiais", async () => {
    const categorias = await prisma.categoria.findMany({
      select: { nome: true, _count: { select: { produtos: true } } },
    });

    expect(categorias).toHaveLength(6);
    for (const categoria of categorias) {
      expect(categoria._count.produtos).toBeGreaterThan(0);
    }
  });

  it("inclui um produto sem estoque, visivel apenas para o artesao dono", async () => {
    const produto = await prisma.produto.findUniqueOrThrow({
      where: { id: seedIds.produtos.colchaBordada },
    });

    expect(produto.quantidadeEstoque).toBe(0);
    expect(produto.ativo).toBe(true);
  });

  it("inclui um produto inativo", async () => {
    const produto = await prisma.produto.findUniqueOrThrow({
      where: { id: seedIds.produtos.cestoFibra },
    });

    expect(produto.ativo).toBe(false);
  });

  it("inclui um produto sem nenhuma venda registrada", async () => {
    const totalVendido = await prisma.itemPedido.aggregate({
      where: { produtoId: seedIds.produtos.jarraFosca },
      _sum: { quantidade: true },
    });

    expect(totalVendido._sum.quantidade).toBeNull();
  });

  it("distribui artesaos por regioes diferentes", async () => {
    const perfis = await prisma.perfilArtesao.findMany({
      select: { regiao: true },
    });
    const regioes = new Set(perfis.map((perfil) => perfil.regiao));

    expect(regioes.size).toBe(2);
  });

  it("nunca grava senha em texto plano reconhecivel como credencial real", async () => {
    const usuarios = await prisma.usuario.findMany({
      select: { senhaHash: true },
    });

    for (const usuario of usuarios) {
      expect(usuario.senhaHash.startsWith("seed$demo$")).toBe(true);
    }
  });

  it("admin so existe via carga sintetica, nunca via cadastro publico simulado", async () => {
    const admin = await prisma.usuario.findUniqueOrThrow({
      where: { id: seedIds.usuarios.admin },
    });

    expect(admin.papel).toBe("admin");
  });
});

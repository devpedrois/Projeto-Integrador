import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../../src/generated/prisma/client.js";

export async function criarFixtureCacheIndicadores(prisma: PrismaClient) {
  return prisma.$transaction(
    async (tx) => {
      const comprador = await tx.usuario.create({
        data: {
          nome: "Comprador sintetico 32.4",
          email: `${randomUUID()}@origem.test`,
          senhaHash: "hash-sintetico",
          papel: "comprador",
        },
      });
      const categoria = await tx.categoria.create({
        data: { nome: `Categoria sintetica ${randomUUID()}` },
      });
      const artesaos: { id: string; produtoId: string; preco: number }[] = [];
      for (const preco of [10, 20, 30]) {
        const usuario = await tx.usuario.create({
          data: {
            nome: "Artesao sintetico 32.4",
            email: `${randomUUID()}@origem.test`,
            senhaHash: "hash-sintetico",
            papel: "artesao",
          },
        });
        const produto = await tx.produto.create({
          data: {
            artesaoId: usuario.id,
            categoriaId: categoria.id,
            tecnicaId: "tecnica-modelagem-argila",
            nome: "Peca sintetica 32.4",
            descricao: "Fixture isolada de indicadores",
            preco,
            quantidadeEstoque: 5,
            quantidadeVendida: artesaos.length + 2,
          },
        });
        artesaos.push({ id: usuario.id, produtoId: produto.id, preco });
      }
      await tx.pedido.create({
        data: {
          compradorId: comprador.id,
          status: "confirmado",
          criadoEm: new Date("2026-11-01T12:00:00.000Z"),
          total: 200,
          itens: {
            create: artesaos.map((artesao, indice) => ({
              produtoId: artesao.produtoId,
              quantidade: indice + 2,
              precoUnitario: artesao.preco,
              subtotal: artesao.preco * (indice + 2),
            })),
          },
        },
      });
      const [a, b, c] = artesaos;
      if (!a || !b || !c) throw new Error("Fixture de indicadores incompleta");
      return { a, b, c, compradorId: comprador.id };
    },
    { timeout: 30000 },
  );
}

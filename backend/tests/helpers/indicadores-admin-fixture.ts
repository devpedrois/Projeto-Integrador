import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../../src/generated/prisma/client.js";

export async function criarMassaIndicadoresAdmin(prisma: PrismaClient) {
  const usuarios = [];
  for (const [papel, ativo] of [
    ["artesao", true],
    ["artesao", true],
    ["artesao", true],
    ["artesao", false],
    ["comprador", true],
    ["admin", true],
  ] as const) {
    usuarios.push(
      await prisma.usuario.create({
        data: {
          nome: "Pessoa sintetica 32.1",
          email: `${randomUUID()}@teste.origem`,
          senhaHash: "sintetico",
          papel,
          ativo,
        },
      }),
    );
  }
  const [artesao, semPerfil, semProdutos, inativo, comprador, admin] = usuarios;
  if (
    !artesao ||
    !semPerfil ||
    !semProdutos ||
    !inativo ||
    !comprador ||
    !admin
  )
    throw new Error("Usuarios da fixture ausentes");
  await prisma.perfilArtesao.create({ data: { usuarioId: artesao.id } });
  const categoria = await prisma.categoria.create({
    data: { nome: "Indicadores 32.1" },
  });
  const produtos = [];
  for (const extra of [
    { artesaoId: artesao.id },
    { artesaoId: artesao.id },
    { artesaoId: semPerfil.id },
    { artesaoId: inativo.id },
    { artesaoId: comprador.id },
    { artesaoId: admin.id },
    { artesaoId: artesao.id, ativo: false },
    { artesaoId: artesao.id, desativadoPorAdmin: true },
    { artesaoId: artesao.id, quantidadeEstoque: 0 },
  ]) {
    produtos.push(
      await prisma.produto.create({
        data: {
          nome: "Peca sintetica 32.1",
          descricao: "Fixture controlada equivalente a 33.3",
          preco: "12.30",
          categoriaId: categoria.id,
          tecnicaId: "tecnica-modelagem-argila",
          quantidadeEstoque: 5,
          ...extra,
        },
      }),
    );
  }
  const produto = produtos[0];
  const oculto = produtos[7];
  if (!produto || !oculto) throw new Error("Produtos da fixture ausentes");
  const primeiro = await prisma.pedido.create({
    data: {
      compradorId: comprador.id,
      status: "confirmado",
      total: "0.10",
      itens: {
        create: [
          { produtoId: produto.id, quantidade: 2, subtotal: "200.00" },
          { produtoId: oculto.id, quantidade: 3, subtotal: "300.00" },
          { produtoId: produto.id, quantidade: 1, subtotal: "100.00" },
        ],
      },
    },
  });
  for (const total of ["0.20", "99999999.99", null]) {
    await prisma.pedido.create({
      data: { compradorId: comprador.id, status: "confirmado", total },
    });
  }
  for (const status of ["pendente", "cancelado"] as const) {
    await prisma.pedido.create({
      data: { compradorId: comprador.id, status, total: "99999999.99" },
    });
  }
  await prisma.produtoFoto.createMany({
    data: [0, 1, 2].map((ordem) => ({
      produtoId: produto.id,
      url: "/sintetico.svg",
      ordem,
    })),
  });
  await prisma.avaliacao.createMany({
    data: [comprador.id, admin.id].map((compradorId) => ({
      compradorId,
      produtoId: produto.id,
      nota: 5,
    })),
  });
  await prisma.pagamento.create({
    data: {
      pedidoId: primeiro.id,
      metodo: "pix_simulado",
      valor: "999.99",
      status: "aprovado",
    },
  });
  return { artesao, comprador, admin };
}

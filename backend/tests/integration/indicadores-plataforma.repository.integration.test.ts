import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "../../src/generated/prisma/client.js";
import { PrismaCatalogoRepository } from "../../src/repositories/catalogo.repository.js";
import { PrismaIndicadoresPlataformaRepository } from "../../src/repositories/indicadores-plataforma.repository.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let vazio: Awaited<ReturnType<typeof criarBancoAuth>>;
let repository: PrismaIndicadoresPlataformaRepository;
let visiveis: string[];

beforeAll(async () => {
  banco = await criarBancoAuth();
  vazio = await criarBancoAuth();
  repository = new PrismaIndicadoresPlataformaRepository(banco.prisma);
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
      await banco.prisma.usuario.create({
        data: {
          nome: "Pessoa sintetica 33.3",
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
  await banco.prisma.perfilArtesao.create({ data: { usuarioId: artesao.id } });
  const categoria = await banco.prisma.categoria.create({
    data: { nome: "Indicadores 33.3" },
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
      await banco.prisma.produto.create({
        data: {
          nome: "Peca sintetica 33.3",
          descricao: "Fixture controlada",
          preco: "12.30",
          categoriaId: categoria.id,
          tecnicaId: "tecnica-modelagem-argila",
          quantidadeEstoque: 5,
          ...extra,
        },
      }),
    );
  }
  visiveis = produtos
    .slice(0, 3)
    .map((p) => p.id)
    .sort();
  const produto = produtos[0];
  const oculto = produtos[7];
  if (!produto || !oculto) throw new Error("Produtos da fixture ausentes");
  const primeiro = await banco.prisma.pedido.create({
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
    await banco.prisma.pedido.create({
      data: {
        compradorId: comprador.id,
        status: "confirmado",
        total,
      },
    });
  }
  for (const status of ["pendente", "cancelado"] as const) {
    await banco.prisma.pedido.create({
      data: { compradorId: comprador.id, status, total: "99999999.99" },
    });
  }
  await banco.prisma.produtoFoto.createMany({
    data: [0, 1, 2].map((ordem) => ({
      produtoId: produto.id,
      url: "/sintetico.svg",
      ordem,
    })),
  });
  await banco.prisma.avaliacao.createMany({
    data: [comprador.id, admin.id].map((compradorId) => ({
      compradorId,
      produtoId: produto.id,
      nota: 5,
    })),
  });
  await banco.prisma.pagamento.create({
    data: {
      pedidoId: primeiro.id,
      metodo: "pix_simulado",
      valor: "999.99",
      status: "aprovado",
    },
  });
}, 120000);

afterAll(async () => {
  await banco?.fechar();
  await vazio?.fechar();
}, 60000);

describe("33.3 indicadores agregados da plataforma", () => {
  it("conta papeis, visibilidade e status sem multiplicar por itens, fotos ou notas", async () => {
    const resultado = await repository.obterDaPlataforma();
    expect(resultado.artesaosAtivos).toBe(3);
    expect(resultado.produtosAtivos).toBe(3);
    expect(resultado.pedidosConfirmados).toBe(4);
    expect(resultado.receitaTotal).toBeInstanceOf(Prisma.Decimal);
    expect(resultado.receitaTotal.toFixed(2)).toBe("100000000.29");
  });

  it("usa exatamente os produtos visiveis pelo catalogo", async () => {
    const catalogo = await new PrismaCatalogoRepository(banco.prisma).listar({
      limit: 100,
      offset: 0,
    });
    expect(catalogo.map((p) => p.id).sort()).toEqual(visiveis);
    expect((await repository.obterDaPlataforma()).produtosAtivos).toBe(
      catalogo.length,
    );
  });

  it("retorna zeros e Decimal quando nao existem registros", async () => {
    const resultado = await new PrismaIndicadoresPlataformaRepository(
      vazio.prisma,
    ).obterDaPlataforma();
    expect(resultado).toEqual({
      artesaosAtivos: 0,
      produtosAtivos: 0,
      pedidosConfirmados: 0,
      receitaTotal: new Prisma.Decimal(0),
    });
    expect(resultado.receitaTotal).toBeInstanceOf(Prisma.Decimal);
  });

  it("confere SQL independente e grava os quatro planos reais", async () => {
    const { runConference } =
      await import("../../scripts/conferir-indicadores-plataforma.js");
    const output = await mkdtemp(join(tmpdir(), "origem-indicadores-33-3-"));
    try {
      const result = await runConference(
        { schema: banco.schema, output },
        {
          DATABASE_URL_VOLUME: process.env.DIRECT_URL,
          NODE_ENV: "test",
        },
      );
      expect(result.comparacao).toEqual([
        {
          indicador: "artesaosAtivos",
          repository: "3",
          sqlIndependente: "3",
          divergencia: false,
        },
        {
          indicador: "produtosAtivos",
          repository: "3",
          sqlIndependente: "3",
          divergencia: false,
        },
        {
          indicador: "pedidosConfirmados",
          repository: "4",
          sqlIndependente: "4",
          divergencia: false,
        },
        {
          indicador: "receitaTotal",
          repository: "100000000.29",
          sqlIndependente: "100000000.29",
          divergencia: false,
        },
      ]);
      const saved = JSON.parse(
        await readFile(join(output, "conferencia.json"), "utf8"),
      ) as { divergencias: number; planos: Record<string, unknown> };
      expect(saved.divergencias).toBe(0);
      expect(Object.keys(saved.planos).sort()).toEqual([
        "artesaosAtivos",
        "pedidosConfirmados",
        "produtosAtivos",
        "receitaTotal",
      ]);
      await expect(
        runConference(
          { schema: banco.schema, output },
          {
            DATABASE_URL_VOLUME: process.env.DIRECT_URL,
            NODE_ENV: "test",
          },
        ),
      ).rejects.toThrow("Artefatos existentes");
    } finally {
      await rm(output, { recursive: true, force: true });
    }
  }, 60000);
});

import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import fixture from "../../../fixtures/recomendacao-produto.fixture.json" with { type: "json" };
import { createApp } from "../../src/app.js";
import { CategoriaRecomendacaoStrategy } from "../../src/integrations/recommendation/categoria-recomendacao.strategy.js";
import { PrismaRecomendacaoRepository } from "../../src/repositories/recomendacao.repository.js";
import type { ProdutoDTO } from "../../src/utils/produto-dto.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

const produtoSchema = z
  .object({
    id: z.uuid(),
    nome: z.string(),
    descricao: z.string(),
    preco: z.number(),
    categoriaId: z.uuid(),
    tecnicaId: z.string(),
    regiaoId: z.string(),
    artesaoId: z.uuid(),
    fotos: z.array(
      z.object({ url: z.string(), ordem: z.number().int() }).strict(),
    ),
    quantidadeEstoque: z.number().int().positive(),
    quantidadeVendida: z.number().int().nonnegative(),
    notaMedia: z.number().min(0).max(5),
    ativo: z.boolean(),
    desativadoPorAdmin: z.boolean(),
    criadoEm: z.iso.datetime(),
  } satisfies Record<keyof ProdutoDTO, z.ZodType>)
  .strict();
const resultadoSchema = z
  .object({
    estrategia: z.string(),
    itens: z.array(produtoSchema).max(fixture.limiteItens),
  })
  .strict();

const TEMPO_PREPARACAO_MS = process.env.CI === "true" ? 120_000 : 30_000;

let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let app: ReturnType<typeof createApp>;
let strategy: CategoriaRecomendacaoStrategy;
let contextoId: string;
let isoladoId: string;
let artesaoId: string;
let cookieAdmin: string;
const secret = "segredo-sintetico-exclusivo-recomendacoes-web13";
const ids = new Map<string, string>();
const regiaoId = "regiao-alto-moura-caruaru";

function idReal(id: string): string {
  const real = ids.get(id);
  if (!real) throw new Error(`Fixture sem ID: ${id}`);
  return real;
}

beforeAll(async () => {
  banco = await criarBancoAuth();
  app = createApp(banco.prisma, { JWT_SECRET: secret, COOKIE_SECURE: false });
  const admin = await banco.prisma.usuario.create({
    data: {
      nome: "Admin IA-01",
      email: `${randomUUID()}@teste.origem`,
      senhaHash: "hash-sintetico",
      papel: "admin",
    },
  });
  cookieAdmin = `origem_sessao=${jwt.sign({ nome: "Sintetico", papel: "admin" }, secret, { subject: admin.id, expiresIn: "1h" })}`;
  strategy = new CategoriaRecomendacaoStrategy(
    new PrismaRecomendacaoRepository(banco.prisma),
  );
  const artesao = await banco.prisma.usuario.create({
    data: {
      nome: "Artesao IA-01",
      email: `${randomUUID()}@teste.origem`,
      senhaHash: "hash-sintetico",
      papel: "artesao",
      perfilArtesao: { create: { regiaoId } },
    },
  });
  artesaoId = artesao.id;
  const compradores = await Promise.all(
    Array.from({ length: 5 }, () =>
      banco.prisma.usuario.create({
        data: {
          nome: "Comprador IA-01",
          email: `${randomUUID()}@teste.origem`,
          senhaHash: "hash-sintetico",
        },
      }),
    ),
  );
  const compradorPrincipal = compradores[0];
  if (!compradorPrincipal) throw new Error("Comprador nao criado");
  const categorias = new Map<string, string>();
  for (const nome of new Set(
    fixture.produtos.map((produto) => produto.categoriaId),
  )) {
    categorias.set(
      nome,
      (await banco.prisma.categoria.create({ data: { nome } })).id,
    );
  }
  const uuids = fixture.produtos.map(() => randomUUID()).sort();
  fixture.produtos
    .map((produto) => produto.id)
    .sort()
    .forEach((id, indice) => {
      const uuid = uuids[indice];
      if (!uuid) throw new Error("UUID nao gerado");
      ids.set(id, uuid);
    });
  for (const produto of fixture.produtos) {
    const id = idReal(produto.id);
    const categoriaId = categorias.get(produto.categoriaId);
    if (!categoriaId) throw new Error("Categoria nao criada");
    await banco.prisma.produto.create({
      data: {
        id,
        nome: produto.nome,
        descricao: produto.descricao,
        preco: produto.preco,
        categoriaId,
        tecnicaId: "tecnica-modelagem-argila",
        artesaoId,
        quantidadeEstoque: produto.quantidadeEstoque,
        ativo: produto.ativo,
        criadoEm: new Date(produto.criadoEm),
        fotos: { create: produto.fotos },
      },
    });
    await banco.prisma.pedido.create({
      data: {
        compradorId: compradorPrincipal.id,
        status: "confirmado",
        itens: {
          create: { produtoId: id, quantidade: produto.quantidadeVendida },
        },
      },
    });
    const notas =
      produto.notaMedia === 4.8 ? [4, 5, 5, 5, 5] : [produto.notaMedia];
    for (const [indice, nota] of notas.entries()) {
      const comprador = compradores[indice];
      if (!comprador) throw new Error("Comprador nao criado");
      await banco.prisma.avaliacao.create({
        data: {
          compradorId: comprador.id,
          produtoId: id,
          nota,
        },
      });
    }
  }
  contextoId = idReal(fixture.contexto.produtoId);
  const categoriaIsolada = await banco.prisma.categoria.create({
    data: { nome: "Categoria isolada IA-01" },
  });
  isoladoId = (
    await banco.prisma.produto.create({
      data: {
        nome: "Contexto isolado",
        descricao: "Sintetico",
        preco: 12.34,
        categoriaId: categoriaIsolada.id,
        tecnicaId: "tecnica-modelagem-argila",
        artesaoId,
        quantidadeEstoque: 2,
      },
    })
  ).id;
  await banco.prisma.produto.update({
    where: { id: idReal("produto-fixture-p01") },
    data: {
      preco: 89.9,
      fotos: { create: { url: "/produtos/segunda.svg", ordem: 1 } },
    },
  });
  await banco.prisma.pedido.create({
    data: {
      compradorId: compradorPrincipal.id,
      status: "cancelado",
      itens: {
        create: { produtoId: idReal("produto-fixture-p01"), quantidade: 10 },
      },
    },
  });
}, TEMPO_PREPARACAO_MS);

afterAll(async () => {
  await banco?.fechar();
});

describe("IA-01 contrato publico de recomendacoes", () => {
  it("retorna o ProdutoDTO completo e identico ao catalogo", async () => {
    const response = await request(app)
      .get("/recomendacoes")
      .query({ produtoId: contextoId });
    expect(response.status).toBe(200);
    const resultado = resultadoSchema.parse(response.body);
    expect(resultado.itens[0]).toMatchObject({
      preco: 89.9,
      tecnicaId: "tecnica-modelagem-argila",
      regiaoId,
      quantidadeVendida: 100,
      notaMedia: 4,
      fotos: [
        { url: "/produtos/fixture.svg", ordem: 0 },
        { url: "/produtos/segunda.svg", ordem: 1 },
      ],
    });
    for (const produto of resultado.itens) {
      expect((await request(app).get(`/produtos/${produto.id}`)).body).toEqual(
        produto,
      );
    }
  });

  it("preserva exatamente o ranking esperado da fixture", async () => {
    const response = await request(app)
      .get("/recomendacoes")
      .query({ produtoId: contextoId });
    const resultado = resultadoSchema.parse(response.body);
    expect(resultado.estrategia).toBe(fixture.resultadoEsperado.estrategia);
    expect(resultado.itens.map((produto) => produto.id)).toEqual(
      fixture.resultadoEsperado.produtoIds.map(idReal),
    );
  });

  it("Strategy retorna somente IDs ordenados e nome da estrategia", async () => {
    expect(await strategy.obter({ produtoId: contextoId })).toEqual({
      estrategia: fixture.resultadoEsperado.estrategia,
      produtoIds: fixture.resultadoEsperado.produtoIds.map(idReal),
    });
  });

  it.each(["categoria", "fallback-geral"])(
    "nao recomenda o proprio produto em %s",
    async (estrategia) => {
      const produtoId = estrategia === "categoria" ? contextoId : isoladoId;
      const response = await request(app)
        .get("/recomendacoes")
        .query({ produtoId: produtoId.toUpperCase() });
      const resultado = resultadoSchema.parse(response.body);
      expect(resultado.estrategia).toBe(estrategia);
      expect(resultado.itens.length).toBeGreaterThan(0);
      expect(resultado.itens.map((produto) => produto.id)).not.toContain(
        produtoId,
      );
    },
  );

  it("fallback tambem retorna produtos completos", async () => {
    for (const contexto of [{ produtoId: randomUUID() }, {}]) {
      const response = await request(app).get("/recomendacoes").query(contexto);
      expect(response.status).toBe(200);
      expect(resultadoSchema.parse(response.body).estrategia).toBe(
        "fallback-geral",
      );
    }
  });

  it.each([
    { tipo: "moderacao", input: { ativo: false } },
    { tipo: "produto", input: { ativo: false } },
    { tipo: "estoque", input: { quantidadeEstoque: 0 } },
  ])(
    "omite produtos invisiveis sem reordenar restantes: %j",
    async ({ tipo, input }) => {
      const id = idReal("produto-fixture-p03");
      try {
        const rota =
          tipo === "moderacao"
            ? `/admin/produtos/${id}/moderar`
            : `/produtos/${id}${tipo === "estoque" ? "/estoque" : ""}`;
        expect(
          (
            await request(app)
              .patch(rota)
              .set("Cookie", cookieAdmin)
              .send(input)
          ).status,
        ).toBe(200);
        const response = await request(app)
          .get("/recomendacoes")
          .query({ produtoId: contextoId });
        const resultado = resultadoSchema.parse(response.body);
        const ordem = resultado.itens.map((produto) => produto.id);
        expect(ordem).not.toContain(id);
        const ranking = fixture.resultadoEsperado.produtoIds
          .map(idReal)
          .filter((produtoId) => produtoId !== id);
        expect(ordem.slice(0, ranking.length)).toEqual(ranking);
      } finally {
        expect(
          (
            await request(app)
              .patch(`/admin/produtos/${id}/moderar`)
              .set("Cookie", cookieAdmin)
              .send({ ativo: true })
          ).status,
        ).toBe(200);
        expect(
          (
            await request(app)
              .patch(`/produtos/${id}`)
              .set("Cookie", cookieAdmin)
              .send({ ativo: true, quantidadeEstoque: 10 })
          ).status,
        ).toBe(200);
      }
    },
  );

  it.each([{ ativo: false }, { papel: "comprador" as const }])(
    "omite produtos de artesao indisponivel: %j",
    async (data) => {
      try {
        const rota =
          "papel" in data
            ? `/admin/usuarios/${artesaoId}/papel`
            : `/admin/artesaos/${artesaoId}/moderar`;
        expect(
          (await request(app).patch(rota).set("Cookie", cookieAdmin).send(data))
            .status,
        ).toBe(200);
        const response = await request(app)
          .get("/recomendacoes")
          .query({ produtoId: contextoId });
        expect(response.status).toBe(200);
        expect(resultadoSchema.parse(response.body).itens).toEqual([]);
      } finally {
        expect(
          (
            await request(app)
              .patch(`/admin/usuarios/${artesaoId}/papel`)
              .set("Cookie", cookieAdmin)
              .send({ papel: "artesao" })
          ).status,
        ).toBe(200);
        expect(
          (
            await request(app)
              .patch(`/admin/artesaos/${artesaoId}/moderar`)
              .set("Cookie", cookieAdmin)
              .send({ ativo: true })
          ).status,
        ).toBe(200);
      }
    },
  );
});

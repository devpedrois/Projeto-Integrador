import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { createApp } from "../../src/app.js";
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
    quantidadeEstoque: z.number().int(),
    quantidadeVendida: z.number().int(),
    notaMedia: z.number(),
    ativo: z.boolean(),
    desativadoPorAdmin: z.boolean().optional(),
    criadoEm: z.iso.datetime(),
  })
  .strict();
let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let app: ReturnType<typeof createApp>;
let categoriaId: string;
let artesaoId: string;
let produtoId: string;
let semAvaliacoesId: string;
const tecnicaId = "tecnica-modelagem-argila";
const regiaoId = "regiao-alto-moura-caruaru";
const ocultos: string[] = [];

beforeAll(async () => {
  banco = await criarBancoAuth();
  app = createApp(banco.prisma);
  const categoria = await banco.prisma.categoria.create({
    data: { nome: "Ceramica sintetica" },
  });
  categoriaId = categoria.id;
  const artesao = await banco.prisma.usuario.create({
    data: {
      nome: "Artesao sintetico",
      email: `${randomUUID()}@teste.origem`,
      senhaHash: "hash-sintetico",
      papel: "artesao",
      perfilArtesao: { create: { regiaoId } },
    },
  });
  artesaoId = artesao.id;
  const data = {
    nome: "Vaso sintetico",
    descricao: "Barro 100% feito_a_mao",
    preco: 89.9,
    categoriaId,
    tecnicaId,
    artesaoId,
    quantidadeEstoque: 4,
  };
  const produto = await banco.prisma.produto.create({
    data: {
      ...data,
      fotos: {
        create: [
          { url: "https://example.test/foto2.jpg", ordem: 1 },
          { url: "https://example.test/foto1.jpg", ordem: 0 },
        ],
      },
    },
  });
  produtoId = produto.id;
  semAvaliacoesId = (
    await banco.prisma.produto.create({
      data: {
        ...data,
        nome: "Prato sintetico",
        descricao: "Ceramica artesanal",
      },
    })
  ).id;
  for (const extra of [
    { ativo: false },
    { desativadoPorAdmin: true },
    { quantidadeEstoque: 0 },
  ]) {
    ocultos.push(
      (await banco.prisma.produto.create({ data: { ...data, ...extra } })).id,
    );
  }
  const inativo = await banco.prisma.usuario.create({
    data: {
      nome: "Artesao inativo",
      email: `${randomUUID()}@teste.origem`,
      senhaHash: "hash-sintetico",
      papel: "artesao",
      ativo: false,
      perfilArtesao: { create: { regiaoId } },
    },
  });
  ocultos.push(
    (
      await banco.prisma.produto.create({
        data: { ...data, artesaoId: inativo.id },
      })
    ).id,
  );
  for (const nota of [4, 5]) {
    const comprador = await banco.prisma.usuario.create({
      data: {
        nome: "Comprador sintetico",
        email: `${randomUUID()}@teste.origem`,
        senhaHash: "hash-sintetico",
      },
    });
    await banco.prisma.avaliacao.create({
      data: { produtoId, compradorId: comprador.id, nota },
    });
    await banco.prisma.pedido.create({
      data: {
        compradorId: comprador.id,
        status: "confirmado",
        itens: { create: { produtoId, quantidade: 2 } },
      },
    });
  }
  const comprador = await banco.prisma.usuario.findFirstOrThrow({
    where: { papel: "comprador" },
  });
  await banco.prisma.pedido.create({
    data: {
      compradorId: comprador.id,
      status: "cancelado",
      itens: { create: { produtoId, quantidade: 10 } },
    },
  });
}, 30_000);

afterAll(async () => {
  await banco?.fechar();
});

describe("catalogo publico WEB-06", () => {
  it("impede cache publico de catalogo e detalhe moderavel", async () => {
    for (const rota of [
      "/produtos",
      `/produtos/${produtoId}`,
      `/avaliacoes?produtoId=${produtoId}`,
    ]) {
      expect((await request(app).get(rota)).headers["cache-control"]).toBe(
        "no-store",
      );
    }
  });
  it("combina termo e todos os filtros sem vazar produtos ocultos", async () => {
    const response = await request(app).get("/produtos").query({
      termo: "VASO",
      categoriaId,
      tecnicaId,
      regiaoId,
      artesaoId,
    });
    expect(response.status).toBe(200);
    expect(response.body.map((produto: { id: string }) => produto.id)).toEqual([
      produtoId,
    ]);
    expect(
      (
        await request(app)
          .get("/produtos")
          .query({ termo: "vaso", categoriaId: randomUUID(), tecnicaId })
      ).body,
    ).toEqual([]);
    expect(
      (
        await request(app)
          .get("/produtos")
          .query({ regiaoId: "regiao-pilar-recife" })
      ).body,
    ).toEqual([]);
  });

  it("valida o contrato Produto e agrega fotos, notas e vendas confirmadas", async () => {
    const lista = await request(app).get("/produtos");
    expect(lista.status).toBe(200);
    const produtos = z.array(produtoSchema).parse(lista.body);
    expect(produtos).toHaveLength(2);
    const produto = produtos.find((item) => item.id === produtoId);
    expect(produto).toMatchObject({
      preco: 89.9,
      tecnicaId,
      regiaoId,
      notaMedia: 4.5,
      quantidadeVendida: 4,
    });
    expect(produto?.fotos).toEqual([
      { url: "https://example.test/foto1.jpg", ordem: 0 },
      { url: "https://example.test/foto2.jpg", ordem: 1 },
    ]);
    const detalhe = await request(app).get(`/produtos/${produtoId}`);
    expect(detalhe.status).toBe(200);
    expect(detalhe.body).toEqual(produto);
  });

  it("ocultos e inexistentes devolvem o mesmo 404", async () => {
    const inexistente = await request(app).get(`/produtos/${randomUUID()}`);
    expect(inexistente.status).toBe(404);
    for (const id of ocultos) {
      const response = await request(app).get(`/produtos/${id}`);
      expect(response.status).toBe(404);
      expect(response.body).toEqual(inexistente.body);
    }
  });

  it("reflete moderacao e estoque imediatamente nas leituras", async () => {
    for (const data of [
      { desativadoPorAdmin: true },
      { quantidadeEstoque: 0 },
    ]) {
      await banco.prisma.produto.update({
        where: { id: semAvaliacoesId },
        data,
      });
      expect(
        (await request(app).get(`/produtos/${semAvaliacoesId}`)).status,
      ).toBe(404);
      const lista = await request(app).get("/produtos");
      expect(lista.body.map((item: { id: string }) => item.id)).not.toContain(
        semAvaliacoesId,
      );
      await banco.prisma.produto.update({
        where: { id: semAvaliacoesId },
        data: { desativadoPorAdmin: false, quantidadeEstoque: 4 },
      });
    }
  });

  it("busca na descricao e trata curingas como texto literal", async () => {
    expect(
      (await request(app).get("/produtos").query({ termo: "100%" })).body,
    ).toHaveLength(1);
    expect(
      (await request(app).get("/produtos").query({ termo: "%" })).body,
    ).toHaveLength(1);
    expect(
      (await request(app).get("/produtos").query({ termo: "_' OR true --" }))
        .body,
    ).toEqual([]);
    expect(
      (await request(app).get("/produtos").query({ termo: "inexistente" }))
        .body,
    ).toEqual([]);
  });

  it("pagina com ordem estavel e sem duplicar registros", async () => {
    const lista = await request(app).get("/produtos");
    const primeira = await request(app).get("/produtos?limit=1&offset=0");
    const segunda = await request(app).get("/produtos?limit=1&offset=1");
    expect(primeira.status).toBe(200);
    expect(segunda.status).toBe(200);
    expect([...primeira.body, ...segunda.body]).toEqual(lista.body);
    expect(
      (await request(app).get("/produtos?limit=100&offset=2")).body,
    ).toEqual([]);
  });

  it.each([
    "categoriaId=texto",
    "artesaoId=texto",
    "tecnicaId=",
    "regiaoId=../x",
    "regiaoId=x%27",
    "categoriaId=a&categoriaId=b",
    "limit=101",
    "limit=0",
    "limit=-1",
    "limit=1.5",
    "offset=-1",
    "offset=10001",
    "offset=Infinity",
    "limit=",
    "termo=" + "a".repeat(201),
    "desconhecido=1",
  ])("rejeita query invalida: %s", async (query) => {
    const response = await request(app).get(`/produtos?${query}`);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDACAO");
  });

  it("rejeita ID invalido no detalhe", async () => {
    expect((await request(app).get("/produtos/invalido")).status).toBe(400);
  });

  it("lista opcoes reais sem dados de usuarios", async () => {
    for (const [rota, id] of [
      ["categorias", categoriaId],
      ["tecnicas", tecnicaId],
      ["regioes", regiaoId],
    ]) {
      const response = await request(app).get(`/${rota}`);
      expect(response.status).toBe(200);
      expect(response.body).toContainEqual({ id, nome: expect.any(String) });
      for (const item of response.body)
        expect(Object.keys(item).sort()).toEqual(["id", "nome"]);
    }
  });

  it("retorna avaliacoes e resumo consistente sem credenciais", async () => {
    const response = await request(app).get("/avaliacoes").query({ produtoId });
    expect(response.status).toBe(200);
    expect(response.body.resumo).toEqual({ media: 4.5, total: 2 });
    expect(response.body.itens).toHaveLength(2);
    expect(response.text).not.toMatch(/senhaHash|email/);
    expect(response.body.itens[0]).toEqual({
      id: expect.any(String),
      produtoId,
      compradorId: expect.any(String),
      nota: expect.any(Number),
      criadoEm: expect.any(String),
    });
    expect(
      (
        await request(app)
          .get("/avaliacoes")
          .query({ produtoId: semAvaliacoesId })
      ).body,
    ).toEqual({ itens: [], resumo: { media: 0, total: 0 } });
  });

  it("avaliações ocultas nao revelam o produto", async () => {
    for (const id of [...ocultos, randomUUID()]) {
      expect(
        (await request(app).get("/avaliacoes").query({ produtoId: id })).status,
      ).toBe(404);
    }
    for (const query of [
      "",
      "produtoId=invalido",
      `produtoId=${produtoId}&extra=1`,
    ]) {
      expect((await request(app).get(`/avaliacoes?${query}`)).status).toBe(400);
    }
  });
});

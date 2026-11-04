import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let app: ReturnType<typeof createApp>;
let produtoId: string;
const idNota = (indice: number) =>
  `00000000-0000-4000-8000-${String(indice).padStart(12, "0")}`;

beforeAll(async () => {
  banco = await criarBancoAuth();
  app = createApp(banco.prisma);
  const artesao = await banco.prisma.usuario.create({
    data: {
      nome: "Artesao sintetico",
      email: `${randomUUID()}@teste.origem`,
      senhaHash: "sintetico",
      papel: "artesao",
    },
  });
  const categoria = await banco.prisma.categoria.create({
    data: { nome: "32.2" },
  });
  produtoId = (
    await banco.prisma.produto.create({
      data: {
        nome: "Peca sintetica 32.2",
        descricao: "Avaliacoes paginadas",
        preco: 10,
        quantidadeEstoque: 1,
        artesaoId: artesao.id,
        categoriaId: categoria.id,
        tecnicaId: "tecnica-modelagem-argila",
      },
    })
  ).id;
  const compradores = Array.from({ length: 35 }, () => ({
    id: randomUUID(),
    nome: "Nome Sobrenome Privado",
    email: `${randomUUID()}@teste.origem`,
    senhaHash: "sintetico",
    papel: "comprador" as const,
  }));
  await banco.prisma.usuario.createMany({ data: compradores });
  await banco.prisma.avaliacao.createMany({
    data: compradores.map((comprador, indice) => ({
      id: idNota(indice + 1),
      produtoId,
      compradorId: comprador.id,
      nota: indice < 30 ? 5 : 1,
      comentario: `Comentario ${indice + 1}`,
      criadoEm: new Date(
        indice < 20 ? "2026-10-01T12:00:00.000Z" : "2026-10-02T12:00:00.000Z",
      ),
    })),
  });
}, 60000);

afterAll(async () => {
  await banco?.fechar();
}, 60000);

describe("32.2 avaliacoes publicas paginadas", () => {
  it("entrega 10/10/10/5 com resumo global e ordem estavel", async () => {
    const paginas = [
      [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
      [31, 32, 33, 34, 35, 1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      [16, 17, 18, 19, 20],
    ];
    for (const [pagina, ids] of paginas.entries()) {
      const response = await request(app)
        .get("/avaliacoes")
        .query({ produtoId, limit: 10, offset: pagina * 10 });
      expect(response.status).toBe(200);
      expect(
        response.body.itens.map((item: { id: string }) => item.id),
      ).toEqual(ids.map(idNota));
      expect(response.body.resumo).toEqual({ media: 4.4, total: 35 });
      expect(response.text).not.toMatch(
        /compradorId|email|senhaHash|Nome Sobrenome/,
      );
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.headers["x-cache"]).toBeUndefined();
    }
  });

  it("usa pagina de dez por padrao", async () => {
    const response = await request(app).get("/avaliacoes").query({ produtoId });
    expect(response.status).toBe(200);
    expect(response.body.itens).toHaveLength(10);
    expect(response.body.resumo).toEqual({ media: 4.4, total: 35 });
  });

  it("aceita limite 50 e pagina vazia preserva resumo global", async () => {
    const todas = await request(app)
      .get("/avaliacoes")
      .query({ produtoId, limit: 50 });
    expect(todas.status).toBe(200);
    expect(todas.body.itens).toHaveLength(35);
    const vazia = await request(app)
      .get("/avaliacoes")
      .query({ produtoId, offset: Number.MAX_SAFE_INTEGER });
    expect(vazia.status).toBe(200);
    expect(vazia.body).toEqual({
      itens: [],
      resumo: { media: 4.4, total: 35 },
    });
  });

  it.each([
    "limit=0",
    "limit=51",
    "limit=1.5",
    "limit=",
    "limit=1&limit=2",
    "offset=-1",
    "offset=0.5",
    "offset=Infinity",
    "offset=9007199254740992",
    "extra=1",
  ])("rejeita query invalida %s", async (query) => {
    const response = await request(app).get(
      `/avaliacoes?produtoId=${produtoId}&${query}`,
    );
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDACAO");
  });
});

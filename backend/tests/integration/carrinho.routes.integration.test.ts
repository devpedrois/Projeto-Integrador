import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

const secret = "segredo-sintetico-exclusivo-testes-web08";
let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let app: ReturnType<typeof createApp>;
let compradorId: string;
let outroId: string;
let artesaoId: string;
let adminId: string;
let produtoId: string;
const ocultos: string[] = [];
function cookie(id: string, papel = "comprador") {
  return `origem_sessao=${jwt.sign({ papel, nome: "Sintetico" }, secret, { subject: id, expiresIn: "1h" })}`;
}
beforeAll(async () => {
  banco = await criarBancoAuth();
  app = createApp(banco.prisma, { JWT_SECRET: secret, COOKIE_SECURE: false });
  for (const papel of ["comprador", "comprador", "artesao", "admin"] as const) {
    const usuario = await banco.prisma.usuario.create({
      data: {
        nome: "Sintetico WEB08",
        email: `${randomUUID()}@teste.origem`,
        senhaHash: "hash-sintetico",
        papel,
        ...(papel === "comprador" ? { carrinho: { create: {} } } : {}),
      },
    });
    if (papel === "artesao") artesaoId = usuario.id;
    else if (papel === "admin") adminId = usuario.id;
    else if (!compradorId) compradorId = usuario.id;
    else outroId = usuario.id;
  }
  const categoria = await banco.prisma.categoria.create({
    data: { nome: "Categoria WEB08" },
  });
  const data = {
    nome: "Vaso WEB08",
    descricao: "Sintetico",
    preco: 25.5,
    categoriaId: categoria.id,
    artesaoId,
    tecnicaId: "tecnica-modelagem-argila",
    quantidadeEstoque: 5,
  };
  produtoId = (await banco.prisma.produto.create({ data })).id;
  for (const extra of [
    { ativo: false },
    { desativadoPorAdmin: true },
    { quantidadeEstoque: 0 },
  ]) {
    ocultos.push(
      (await banco.prisma.produto.create({ data: { ...data, ...extra } })).id,
    );
  }
}, 30_000);
beforeEach(async () => {
  await banco.prisma.itemCarrinho.deleteMany({
    where: { carrinhoId: { in: [compradorId, outroId] } },
  });
  await banco.prisma.produto.update({
    where: { id: produtoId },
    data: { quantidadeEstoque: 5, preco: 25.5, ativo: true },
  });
  await banco.prisma.usuario.update({
    where: { id: artesaoId },
    data: { ativo: true },
  });
});
afterAll(async () => {
  await banco?.fechar();
});

describe("WEB-08 carrinho do comprador", () => {
  it.each(["anonimo", "artesao", "admin"])(
    "protege todas as rotas para %s",
    async (papel) => {
      const id = papel === "artesao" ? artesaoId : adminId;
      for (const metodo of ["get", "post", "patch", "delete"] as const) {
        const url =
          metodo === "get"
            ? "/carrinho"
            : metodo === "post"
              ? "/carrinho/itens"
              : `/carrinho/itens/${produtoId}`;
        const chamada = request(app)[metodo](url);
        if (papel !== "anonimo") chamada.set("Cookie", cookie(id, papel));
        const response = await chamada.send(
          metodo === "post" ? { produtoId, quantidade: 1 } : { quantidade: 1 },
        );
        expect(response.status).toBe(papel === "anonimo" ? 401 : 403);
      }
    },
  );
  it("le carrinho vazio somente da sessao e impede cache", async () => {
    const response = await request(app)
      .get("/carrinho")
      .set("Cookie", cookie(compradorId));
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toEqual({
      itens: [],
      total: 0,
      atualizadoEm: expect.any(String),
    });
  });
  it("POST soma, grava preco do banco e persiste entre sessoes", async () => {
    for (const quantidade of [2, 1]) {
      const response = await request(app)
        .post("/carrinho/itens")
        .set("Cookie", cookie(compradorId))
        .send({ produtoId, quantidade });
      expect(response.status).toBe(200);
    }
    const response = await request(app)
      .get("/carrinho")
      .set("Cookie", cookie(compradorId));
    expect(response.body).toMatchObject({
      total: 76.5,
      itens: [
        {
          produtoId,
          nome: "Vaso WEB08",
          precoUnitario: 25.5,
          quantidade: 3,
          estoqueDisponivel: 5,
        },
      ],
    });
    const item = await banco.prisma.itemCarrinho.findUniqueOrThrow({
      where: { carrinhoId_produtoId: { carrinhoId: compradorId, produtoId } },
    });
    expect(Number(item.precoUnitario)).toBe(25.5);
    expect(item.quantidade).toBe(3);
    const outro = await request(app)
      .get("/carrinho")
      .set("Cookie", cookie(outroId));
    expect(outro.body.itens).toEqual([]);
    expect(
      (
        await banco.prisma.produto.findUniqueOrThrow({
          where: { id: produtoId },
        })
      ).quantidadeEstoque,
    ).toBe(5);
  });
  it("PATCH substitui quantidade e atualiza preco a partir do banco", async () => {
    await request(app)
      .post("/carrinho/itens")
      .set("Cookie", cookie(compradorId))
      .send({ produtoId, quantidade: 1 });
    await banco.prisma.produto.update({
      where: { id: produtoId },
      data: { preco: 30 },
    });
    const response = await request(app)
      .patch(`/carrinho/itens/${produtoId}`)
      .set("Cookie", cookie(compradorId))
      .send({ quantidade: 4 });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      total: 120,
      itens: [{ precoUnitario: 30, quantidade: 4 }],
    });
    expect(
      Number(
        (
          await banco.prisma.itemCarrinho.findFirstOrThrow({
            where: { carrinhoId: compradorId },
          })
        ).precoUnitario,
      ),
    ).toBe(30);
  });
  it("DELETE remove somente da sessao atual e permite limpar ocultos", async () => {
    await request(app)
      .post("/carrinho/itens")
      .set("Cookie", cookie(compradorId))
      .send({ produtoId, quantidade: 2 });
    expect(
      (
        await request(app)
          .delete(`/carrinho/itens/${produtoId}`)
          .set("Cookie", cookie(outroId))
      ).status,
    ).toBe(404);
    await banco.prisma.produto.update({
      where: { id: produtoId },
      data: { ativo: false },
    });
    const response = await request(app)
      .delete(`/carrinho/itens/${produtoId}`)
      .set("Cookie", cookie(compradorId));
    expect(response.status).toBe(200);
    expect(response.body.itens).toEqual([]);
  });
  it("409 inclui produto e nome sem alterar quantidade ou preco", async () => {
    await request(app)
      .post("/carrinho/itens")
      .set("Cookie", cookie(compradorId))
      .send({ produtoId, quantidade: 3 });
    await banco.prisma.produto.update({
      where: { id: produtoId },
      data: { preco: 40, quantidadeEstoque: 3 },
    });
    for (const metodo of ["post", "patch"] as const) {
      const chamada =
        metodo === "post"
          ? request(app).post("/carrinho/itens")
          : request(app).patch(`/carrinho/itens/${produtoId}`);
      const response = await chamada
        .set("Cookie", cookie(compradorId))
        .send(
          metodo === "post" ? { produtoId, quantidade: 1 } : { quantidade: 4 },
        );
      expect(response.status).toBe(409);
      expect(response.body.error).toMatchObject({
        code: "ESTOQUE_INSUFICIENTE",
        details: { produtoId, nome: "Vaso WEB08" },
      });
      const item = await banco.prisma.itemCarrinho.findFirstOrThrow({
        where: { carrinhoId: compradorId },
      });
      expect(item.quantidade).toBe(3);
      expect(Number(item.precoUnitario)).toBe(25.5);
    }
  });
  it("produto oculto, inexistente ou artesao inativo retorna 404", async () => {
    for (const id of [...ocultos, randomUUID()]) {
      expect(
        (
          await request(app)
            .post("/carrinho/itens")
            .set("Cookie", cookie(compradorId))
            .send({ produtoId: id, quantidade: 1 })
        ).status,
      ).toBe(404);
    }
    await banco.prisma.usuario.update({
      where: { id: artesaoId },
      data: { ativo: false },
    });
    expect(
      (
        await request(app)
          .post("/carrinho/itens")
          .set("Cookie", cookie(compradorId))
          .send({ produtoId, quantidade: 1 })
      ).status,
    ).toBe(404);
  });
  it.each([0, -1, 1.5, "2", 2147483648])(
    "rejeita quantidade invalida %s",
    async (quantidade) => {
      expect(
        (
          await request(app)
            .post("/carrinho/itens")
            .set("Cookie", cookie(compradorId))
            .send({ produtoId, quantidade })
        ).status,
      ).toBe(400);
      expect(
        (
          await request(app)
            .patch(`/carrinho/itens/${produtoId}`)
            .set("Cookie", cookie(compradorId))
            .send({ quantidade })
        ).status,
      ).toBe(400);
    },
  );
  it("rejeita identidade ou preco externos e query na leitura", async () => {
    for (const extra of [
      { compradorId: outroId },
      { carrinhoId: outroId },
      { precoUnitario: 0.01 },
    ]) {
      expect(
        (
          await request(app)
            .post("/carrinho/itens")
            .set("Cookie", cookie(compradorId))
            .send({ produtoId, quantidade: 1, ...extra })
        ).status,
      ).toBe(400);
    }
    expect(
      (
        await request(app)
          .get("/carrinho")
          .query({ compradorId: outroId })
          .set("Cookie", cookie(compradorId))
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .patch("/carrinho/itens/invalido")
          .set("Cookie", cookie(compradorId))
          .send({ quantidade: 1 })
      ).status,
    ).toBe(400);
  });
  it("adicoes concorrentes nao perdem quantidade nem ultrapassam estoque", async () => {
    const responses = await Promise.all(
      [3, 3].map((quantidade) =>
        request(app)
          .post("/carrinho/itens")
          .set("Cookie", cookie(compradorId))
          .send({ produtoId, quantidade }),
      ),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(
      (
        await banco.prisma.itemCarrinho.findFirstOrThrow({
          where: { carrinhoId: compradorId },
        })
      ).quantidade,
    ).toBe(3);
  });
});

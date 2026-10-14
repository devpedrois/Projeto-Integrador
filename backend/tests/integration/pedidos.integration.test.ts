import { randomUUID } from "node:crypto";
import "dotenv/config";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { createPrismaClient } from "../../src/database/prisma/client.js";
import { gerarHash } from "../../src/utils/senha.js";
import { databasePool } from "../helpers/database.js";
import {
  criarCategoria,
  criarUsuarioArtesao,
  criarUsuarioComprador,
} from "../helpers/dominio-fixtures.js";

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error("DATABASE_URL is required for integration tests");
}

const prisma = createPrismaClient(databaseUrl);
const app = createApp(prisma, {
  JWT_SECRET: "segredo-sintetico-testes-checkout-web04",
  COOKIE_SECURE: false,
});

let artesaoId: string;
let categoriaId: string;
let compradorId: string;
let cookieComprador: string;

async function createProduto(quantidadeEstoque: number): Promise<string> {
  const id = randomUUID();
  await databasePool.query(
    `INSERT INTO "Produto" ("id", "nome", "descricao", "preco", "artesaoId", "categoriaId", "quantidadeEstoque", "tecnicaId") VALUES ($1, $2, 'Descricao de teste', 10.00, $3, $4, $5, 'tecnica-modelagem-argila')`,
    [id, "Produto de teste", artesaoId, categoriaId, quantidadeEstoque],
  );
  return id;
}

async function getEstoque(produtoId: string): Promise<number> {
  const result = await databasePool.query<{ quantidadeEstoque: number }>(
    'SELECT "quantidadeEstoque" FROM "Produto" WHERE "id" = $1',
    [produtoId],
  );
  return result.rows[0]?.quantidadeEstoque ?? -1;
}

async function countPedidos(): Promise<number> {
  const result = await databasePool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM "Pedido" WHERE "compradorId" = $1',
    [compradorId],
  );
  return Number(result.rows[0]?.count ?? "0");
}

const createdProdutoIds: string[] = [];

beforeAll(async () => {
  artesaoId = await criarUsuarioArtesao(databasePool);
  categoriaId = await criarCategoria(databasePool);
  compradorId = await criarUsuarioComprador(databasePool);
  const senha = "SenhaSinteticaCheckout!";
  await prisma.usuario.update({
    where: { id: compradorId },
    data: { senhaHash: await gerarHash(senha) },
  });
  const login = await request(app)
    .post("/auth/login")
    .send({ email: `comprador-${compradorId}@teste.origem`, senha });
  expect(login.status).toBe(200);
  const cookies = login.headers["set-cookie"] as string[] | undefined;
  const cookie = cookies?.[0]?.split(";")[0];
  if (!cookie) throw new Error("Login nao emitiu cookie de comprador");
  cookieComprador = cookie;
});

afterEach(async () => {
  await databasePool.query(
    'DELETE FROM "IntencaoNotificacao" WHERE "pedidoId" IN (SELECT "id" FROM "Pedido" WHERE "compradorId" = $1)',
    [compradorId],
  );
  await databasePool.query(
    'DELETE FROM "ItemPedido" WHERE "pedidoId" IN (SELECT "id" FROM "Pedido" WHERE "compradorId" = $1)',
    [compradorId],
  );
  await databasePool.query(
    'DELETE FROM "Pagamento" WHERE "pedidoId" IN (SELECT "id" FROM "Pedido" WHERE "compradorId" = $1)',
    [compradorId],
  );
  await databasePool.query('DELETE FROM "Pedido" WHERE "compradorId" = $1', [
    compradorId,
  ]);
  if (createdProdutoIds.length > 0) {
    await databasePool.query('DELETE FROM "Produto" WHERE "id" = ANY($1)', [
      createdProdutoIds,
    ]);
    createdProdutoIds.length = 0;
  }
});

afterAll(async () => {
  await databasePool.query('DELETE FROM "Usuario" WHERE "id" = ANY($1)', [
    [artesaoId, compradorId],
  ]);
  await databasePool.query('DELETE FROM "Categoria" WHERE "id" = $1', [
    categoriaId,
  ]);
  await prisma.$disconnect();
  await databasePool.end();
});

describe("POST /pedidos", () => {
  it("mantem checkout concorrente com cookie: uma criacao e um conflito", async () => {
    const produtoId = await createProduto(1);
    createdProdutoIds.push(produtoId);
    const responses = await Promise.all(
      [1, 2].map(() =>
        request(app)
          .post("/pedidos")
          .set("Cookie", cookieComprador)
          .send({ itens: [{ produtoId, quantidade: 1 }] }),
      ),
    );
    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(await getEstoque(produtoId)).toBe(0);
    expect(await countPedidos()).toBe(1);
  });
  it("creates an order and decrements stock exactly by the requested quantity", async () => {
    const produtoId = await createProduto(5);
    createdProdutoIds.push(produtoId);

    const response = await request(app)
      .post("/pedidos")
      .set("Cookie", cookieComprador)
      .send({
        itens: [{ produtoId, quantidade: 2 }],
      });

    expect(response.status).toBe(201);
    expect(response.body.pedido.status).toBe("confirmado");
    expect(response.body.itens).toEqual([
      {
        produtoId,
        quantidade: 2,
        nome: "Produto de teste",
        precoUnitario: 10,
        subtotal: 20,
      },
    ]);
    expect(await getEstoque(produtoId)).toBe(3);
    expect(await countPedidos()).toBe(1);
  });

  it("rejects an order referencing a missing product", async () => {
    const response = await request(app)
      .post("/pedidos")
      .set("Cookie", cookieComprador)
      .send({
        itens: [{ produtoId: randomUUID(), quantidade: 1 }],
      });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PRODUTO_NAO_ENCONTRADO");
    expect(await countPedidos()).toBe(0);
  });

  it("rejects an order with an invalid quantity", async () => {
    const produtoId = await createProduto(5);
    createdProdutoIds.push(produtoId);

    const response = await request(app)
      .post("/pedidos")
      .set("Cookie", cookieComprador)
      .send({
        itens: [{ produtoId, quantidade: 0 }],
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDACAO");
    expect(await countPedidos()).toBe(0);
    expect(await getEstoque(produtoId)).toBe(5);
  });

  it("rejects an order when stock is insufficient", async () => {
    const produtoId = await createProduto(1);
    createdProdutoIds.push(produtoId);

    const response = await request(app)
      .post("/pedidos")
      .set("Cookie", cookieComprador)
      .send({
        itens: [{ produtoId, quantidade: 2 }],
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ESTOQUE_INSUFICIENTE");
    expect(await getEstoque(produtoId)).toBe(1);
    expect(await countPedidos()).toBe(0);
  });

  it("rolls back the whole order when one item among several fails", async () => {
    const produtoValido = await createProduto(5);
    const produtoSemEstoque = await createProduto(1);
    createdProdutoIds.push(produtoValido, produtoSemEstoque);

    const response = await request(app)
      .post("/pedidos")
      .set("Cookie", cookieComprador)
      .send({
        itens: [
          { produtoId: produtoValido, quantidade: 2 },
          { produtoId: produtoSemEstoque, quantidade: 5 },
        ],
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ESTOQUE_INSUFICIENTE");
    expect(await getEstoque(produtoValido)).toBe(5);
    expect(await getEstoque(produtoSemEstoque)).toBe(1);
    expect(await countPedidos()).toBe(0);
  });

  it("treats case-variant duplicate produtoId as the same product and never goes negative", async () => {
    const produtoId = await createProduto(5);
    createdProdutoIds.push(produtoId);

    const response = await request(app)
      .post("/pedidos")
      .set("Cookie", cookieComprador)
      .send({
        itens: [
          { produtoId, quantidade: 3 },
          { produtoId: produtoId.toUpperCase(), quantidade: 3 },
        ],
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ESTOQUE_INSUFICIENTE");
    expect(await getEstoque(produtoId)).toBe(5);
    expect(await getEstoque(produtoId)).toBeGreaterThanOrEqual(0);
    expect(await countPedidos()).toBe(0);
  });
});

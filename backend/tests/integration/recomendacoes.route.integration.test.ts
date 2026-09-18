import { randomUUID } from "node:crypto";
import "dotenv/config";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { createPrismaClient } from "../../src/database/prisma/client.js";
import { databasePool } from "../helpers/database.js";
import { criarCategoria, criarProduto, criarUsuarioArtesao } from "../helpers/dominio-fixtures.js";

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error("DATABASE_URL is required for integration tests");
}

const prisma = createPrismaClient(databaseUrl);
const app = createApp(prisma);

let artesaoId: string;
let categoriaId: string;
let produtoContextoId: string;
let produtoRelacionadoId: string;

const idsProdutoCriados: string[] = [];
const idsCategoriaCriados: string[] = [];
const idsUsuarioCriados: string[] = [];

beforeAll(async () => {
  artesaoId = await criarUsuarioArtesao(databasePool);
  idsUsuarioCriados.push(artesaoId);
  categoriaId = await criarCategoria(databasePool);
  idsCategoriaCriados.push(categoriaId);

  produtoContextoId = await criarProduto(databasePool, { artesaoId, categoriaId });
  produtoRelacionadoId = await criarProduto(databasePool, { artesaoId, categoriaId });
  idsProdutoCriados.push(produtoContextoId, produtoRelacionadoId);
});

afterAll(async () => {
  await databasePool.query('DELETE FROM "Produto" WHERE "id" = ANY($1)', [idsProdutoCriados]);
  await databasePool.query('DELETE FROM "Categoria" WHERE "id" = ANY($1)', [idsCategoriaCriados]);
  await databasePool.query('DELETE FROM "Usuario" WHERE "id" = ANY($1)', [idsUsuarioCriados]);
  await prisma.$disconnect();
  await databasePool.end();
});

describe("GET /recomendacoes", () => {
  it("returns category-based recommendations for a valid produtoId", async () => {
    const response = await request(app).get("/recomendacoes").query({
      produtoId: produtoContextoId,
    });

    expect(response.status).toBe(200);
    expect(response.body.estrategia).toBe("categoria");
    expect(Array.isArray(response.body.itens)).toBe(true);
    expect(response.body.itens.length).toBeGreaterThan(0);
    expect(response.body.itens.length).toBeLessThanOrEqual(8);
    expect(response.body.itens.some((item: { id: string }) => item.id === produtoContextoId)).toBe(
      false,
    );

    const item = response.body.itens.find(
      (candidato: { id: string }) => candidato.id === produtoRelacionadoId,
    );
    expect(item).toEqual({
      id: produtoRelacionadoId,
      nome: expect.any(String),
      descricao: null,
      preco: null,
      quantidadeEstoque: expect.any(Number),
      categoriaId,
      artesaoId,
    });
  });

  it("returns the general fallback for a valid usuarioId", async () => {
    const response = await request(app).get("/recomendacoes").query({
      usuarioId: randomUUID(),
    });

    expect(response.status).toBe(200);
    expect(response.body.estrategia).toBe("fallback-geral");
    expect(Array.isArray(response.body.itens)).toBe(true);
    expect(response.body.itens.length).toBeLessThanOrEqual(8);
  });

  it("rejects a request with no context parameter", async () => {
    const response = await request(app).get("/recomendacoes");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDACAO");
  });

  it("rejects a request with both context parameters at once", async () => {
    const response = await request(app).get("/recomendacoes").query({
      produtoId: produtoContextoId,
      usuarioId: randomUUID(),
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDACAO");
  });

  it("rejects an invalid UUID", async () => {
    const response = await request(app).get("/recomendacoes").query({
      produtoId: "nao-e-um-uuid",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDACAO");
  });

  it("falls back to the general recommendation when the product does not exist", async () => {
    const response = await request(app).get("/recomendacoes").query({
      produtoId: randomUUID(),
    });

    expect(response.status).toBe(200);
    expect(response.body.estrategia).toBe("fallback-geral");
  });
});

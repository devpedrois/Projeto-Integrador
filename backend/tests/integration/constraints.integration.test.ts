import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { afterAll, afterEach, beforeEach, describe, it } from "vitest";
import { databasePool } from "../helpers/database.js";
import {
  criarCategoria,
  criarPedido,
  criarUsuarioArtesao,
  criarUsuarioComprador,
} from "../helpers/dominio-fixtures.js";
import { expectPostgresError } from "../helpers/postgres-error.js";

let client: PoolClient;

beforeEach(async () => {
  client = await databasePool.connect();
  await client.query("BEGIN");
});

afterEach(async () => {
  await client.query("ROLLBACK");
  client.release();
});

afterAll(async () => {
  await databasePool.end();
});

describe("reduced FCCPD schema constraints", () => {
  it("rejects negative stock", async () => {
    const artesaoId = await criarUsuarioArtesao(client);
    const categoriaId = await criarCategoria(client);

    await expectPostgresError(
      client.query(
        'INSERT INTO "Produto" ("id", "nome", "artesaoId", "categoriaId", "quantidadeEstoque") VALUES ($1, $2, $3, $4, $5)',
        [randomUUID(), "Produto invalido", artesaoId, categoriaId, -1],
      ),
      "23514",
    );
  });

  it("rejects zero item quantity", async () => {
    const artesaoId = await criarUsuarioArtesao(client);
    const categoriaId = await criarCategoria(client);
    const compradorId = await criarUsuarioComprador(client);
    const produtoId = randomUUID();
    await client.query(
      'INSERT INTO "Produto" ("id", "nome", "artesaoId", "categoriaId", "quantidadeEstoque") VALUES ($1, $2, $3, $4, $5)',
      [produtoId, "Produto valido", artesaoId, categoriaId, 1],
    );
    const pedidoId = await criarPedido(client, { compradorId });

    await expectPostgresError(
      client.query(
        'INSERT INTO "ItemPedido" ("id", "pedidoId", "produtoId", "quantidade") VALUES ($1, $2, $3, $4)',
        [randomUUID(), pedidoId, produtoId, 0],
      ),
      "23514",
    );
  });

  it("rejects missing required relationships", async () => {
    await expectPostgresError(
      client.query(
        'INSERT INTO "ItemPedido" ("id", "pedidoId", "produtoId", "quantidade") VALUES ($1, $2, $3, $4)',
        [randomUUID(), null, null, 1],
      ),
      "23502",
    );
  });

  it("rejects unknown relationship references", async () => {
    await expectPostgresError(
      client.query(
        'INSERT INTO "ItemPedido" ("id", "pedidoId", "produtoId", "quantidade") VALUES ($1, $2, $3, $4)',
        [randomUUID(), randomUUID(), randomUUID(), 1],
      ),
      "23503",
    );
  });

  it.each([
    { scenario: "missing", pedidoId: null, code: "23502" },
    { scenario: "unknown", pedidoId: "22222222-2222-4222-8222-222222222222", code: "23503" },
  ])("rejects $scenario pedidoId with a valid produtoId", async ({ pedidoId, code }) => {
    const artesaoId = await criarUsuarioArtesao(client);
    const categoriaId = await criarCategoria(client);
    const produtoId = randomUUID();
    await client.query(
      'INSERT INTO "Produto" ("id", "nome", "artesaoId", "categoriaId", "quantidadeEstoque") VALUES ($1, $2, $3, $4, $5)',
      [produtoId, "Produto sintetico", artesaoId, categoriaId, 1],
    );

    await expectPostgresError(
      client.query(
        'INSERT INTO "ItemPedido" ("id", "pedidoId", "produtoId", "quantidade") VALUES ($1, $2, $3, $4)',
        [randomUUID(), pedidoId, produtoId, 1],
      ),
      code,
    );
  });

  it.each([
    { scenario: "missing", produtoId: null, code: "23502" },
    { scenario: "unknown", produtoId: "33333333-3333-4333-8333-333333333333", code: "23503" },
  ])("rejects $scenario produtoId with a valid pedidoId", async ({ produtoId, code }) => {
    const compradorId = await criarUsuarioComprador(client);
    const pedidoId = await criarPedido(client, { compradorId });

    await expectPostgresError(
      client.query(
        'INSERT INTO "ItemPedido" ("id", "pedidoId", "produtoId", "quantidade") VALUES ($1, $2, $3, $4)',
        [randomUUID(), pedidoId, produtoId, 1],
      ),
      code,
    );
  });
});

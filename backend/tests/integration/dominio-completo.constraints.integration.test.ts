import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { databasePool } from "../helpers/database.js";
import {
  criarCategoria,
  criarPedido,
  criarProduto,
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

describe("full domain schema constraints (PI4-19.5)", () => {
  it("rejects an order without a comprador (usuario)", async () => {
    await expectPostgresError(
      client.query(
        'INSERT INTO "Pedido" ("id", "compradorRef", "compradorId") VALUES ($1, $2, $3)',
        [randomUUID(), "comprador-sem-usuario", null],
      ),
      "23502",
    );
  });

  it("rejects an item without a pedido", async () => {
    const artesaoId = await criarUsuarioArtesao(client);
    const categoriaId = await criarCategoria(client);
    const produtoId = await criarProduto(client, { artesaoId, categoriaId });

    await expectPostgresError(
      client.query(
        'INSERT INTO "ItemPedido" ("id", "pedidoId", "produtoId", "quantidade") VALUES ($1, $2, $3, $4)',
        [randomUUID(), null, produtoId, 1],
      ),
      "23502",
    );
  });

  it("rejects an item without a produto", async () => {
    const compradorId = await criarUsuarioComprador(client);
    const pedidoId = await criarPedido(client, { compradorId });

    await expectPostgresError(
      client.query(
        'INSERT INTO "ItemPedido" ("id", "pedidoId", "produtoId", "quantidade") VALUES ($1, $2, $3, $4)',
        [randomUUID(), pedidoId, null, 1],
      ),
      "23502",
    );
  });

  it("rejects a produto without an artesao", async () => {
    const categoriaId = await criarCategoria(client);

    await expectPostgresError(
      client.query(
        'INSERT INTO "Produto" ("id", "nome", "artesaoId", "categoriaId", "quantidadeEstoque") VALUES ($1, $2, $3, $4, $5)',
        [randomUUID(), "Produto sem artesao", null, categoriaId, 1],
      ),
      "23502",
    );
  });

  it("rejects a produto without a categoria", async () => {
    const artesaoId = await criarUsuarioArtesao(client);

    await expectPostgresError(
      client.query(
        'INSERT INTO "Produto" ("id", "nome", "artesaoId", "categoriaId", "quantidadeEstoque") VALUES ($1, $2, $3, $4, $5)',
        [randomUUID(), "Produto sem categoria", artesaoId, null, 1],
      ),
      "23502",
    );
  });

  it("rejects a duplicate email", async () => {
    const email = `duplicado-${randomUUID()}@teste.origem`;
    await client.query(
      'INSERT INTO "Usuario" ("id", "nome", "email", "senhaHash") VALUES ($1, $2, $3, $4)',
      [randomUUID(), "Primeiro usuario", email, "hash-de-teste"],
    );

    await expectPostgresError(
      client.query(
        'INSERT INTO "Usuario" ("id", "nome", "email", "senhaHash") VALUES ($1, $2, $3, $4)',
        [randomUUID(), "Segundo usuario", email, "hash-de-teste"],
      ),
      "23505",
    );
  });

  it("rejects negative stock on the full domain schema", async () => {
    const artesaoId = await criarUsuarioArtesao(client);
    const categoriaId = await criarCategoria(client);

    await expectPostgresError(
      client.query(
        'INSERT INTO "Produto" ("id", "nome", "artesaoId", "categoriaId", "quantidadeEstoque") VALUES ($1, $2, $3, $4, $5)',
        [randomUUID(), "Produto com estoque invalido", artesaoId, categoriaId, -1],
      ),
      "23514",
    );
  });

  it.each([0, 6])("rejects a nota of %i outside the 1-5 range", async (nota) => {
    const artesaoId = await criarUsuarioArtesao(client);
    const categoriaId = await criarCategoria(client);
    const compradorId = await criarUsuarioComprador(client);
    const produtoId = await criarProduto(client, { artesaoId, categoriaId });

    await expectPostgresError(
      client.query(
        'INSERT INTO "Avaliacao" ("id", "compradorId", "produtoId", "nota") VALUES ($1, $2, $3, $4)',
        [randomUUID(), compradorId, produtoId, nota],
      ),
      "23514",
    );
  });

  it("rejects a second pagamento for the same pedido", async () => {
    const compradorId = await criarUsuarioComprador(client);
    const pedidoId = await criarPedido(client, { compradorId });

    await client.query(
      'INSERT INTO "Pagamento" ("id", "pedidoId", "valor", "status") VALUES ($1, $2, $3, $4)',
      [randomUUID(), pedidoId, "10.00", "aprovado"],
    );

    await expectPostgresError(
      client.query(
        'INSERT INTO "Pagamento" ("id", "pedidoId", "valor", "status") VALUES ($1, $2, $3, $4)',
        [randomUUID(), pedidoId, "10.00", "aprovado"],
      ),
      "23505",
    );
  });

  it("preserves ItemPedido when the produto is logically deactivated", async () => {
    const artesaoId = await criarUsuarioArtesao(client);
    const categoriaId = await criarCategoria(client);
    const compradorId = await criarUsuarioComprador(client);
    const produtoId = await criarProduto(client, { artesaoId, categoriaId });
    const pedidoId = await criarPedido(client, { compradorId });
    const itemId = randomUUID();

    await client.query(
      'INSERT INTO "ItemPedido" ("id", "pedidoId", "produtoId", "quantidade") VALUES ($1, $2, $3, $4)',
      [itemId, pedidoId, produtoId, 1],
    );

    await client.query('UPDATE "Produto" SET "ativo" = false WHERE "id" = $1', [produtoId]);

    const result = await client.query<{ id: string }>(
      'SELECT "id" FROM "ItemPedido" WHERE "id" = $1',
      [itemId],
    );
    expect(result.rows).toHaveLength(1);

    const produto = await client.query<{ ativo: boolean }>(
      'SELECT "ativo" FROM "Produto" WHERE "id" = $1',
      [produtoId],
    );
    expect(produto.rows[0]?.ativo).toBe(false);
  });
});

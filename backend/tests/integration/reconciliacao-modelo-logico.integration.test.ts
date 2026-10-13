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

const NOT_NULL_VIOLATION = "23502";
const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";

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

async function inserirProduto(overrides: {
  descricao?: string | null;
  preco?: string | null;
  quantidadeEstoque?: number;
}): Promise<unknown> {
  const artesaoId = await criarUsuarioArtesao(client);
  const categoriaId = await criarCategoria(client);
  return client.query(
    'INSERT INTO "Produto" ("id", "nome", "descricao", "preco", "artesaoId", "categoriaId", "quantidadeEstoque") VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [
      randomUUID(),
      "Produto de teste",
      overrides.descricao === undefined ? "Descricao de teste" : overrides.descricao,
      overrides.preco === undefined ? "10.00" : overrides.preco,
      artesaoId,
      categoriaId,
      overrides.quantidadeEstoque ?? 1,
    ],
  );
}

async function criarPedidoComProduto(): Promise<{ pedidoId: string; produtoId: string }> {
  const artesaoId = await criarUsuarioArtesao(client);
  const categoriaId = await criarCategoria(client);
  const compradorId = await criarUsuarioComprador(client);
  const produtoId = await criarProduto(client, { artesaoId, categoriaId });
  const pedidoId = await criarPedido(client, { compradorId });
  return { pedidoId, produtoId };
}

describe("Produto reconciled with the logical model (BD-02)", () => {
  it("rejects a product without descricao", async () => {
    await expectPostgresError(inserirProduto({ descricao: null }), NOT_NULL_VIOLATION);
  });

  it("rejects a product without preco", async () => {
    await expectPostgresError(inserirProduto({ preco: null }), NOT_NULL_VIOLATION);
  });

  it("rejects a product with preco 0", async () => {
    await expectPostgresError(inserirProduto({ preco: "0.00" }), CHECK_VIOLATION);
  });

  it("rejects a product with a negative stock", async () => {
    await expectPostgresError(inserirProduto({ quantidadeEstoque: -1 }), CHECK_VIOLATION);
  });

  it("defaults desativadoPorAdmin to false", async () => {
    const artesaoId = await criarUsuarioArtesao(client);
    const categoriaId = await criarCategoria(client);
    const produtoId = await criarProduto(client, { artesaoId, categoriaId });

    const result = await client.query<{ desativadoPorAdmin: boolean }>(
      'SELECT "desativadoPorAdmin" FROM "Produto" WHERE "id" = $1',
      [produtoId],
    );
    expect(result.rows[0]?.desativadoPorAdmin).toBe(false);
  });
});

describe("monetary non-negativity (BD-02)", () => {
  it("rejects a negative ItemPedido.precoUnitario", async () => {
    const { pedidoId, produtoId } = await criarPedidoComProduto();
    await expectPostgresError(
      client.query(
        'INSERT INTO "ItemPedido" ("id", "pedidoId", "produtoId", "quantidade", "precoUnitario") VALUES ($1, $2, $3, $4, $5)',
        [randomUUID(), pedidoId, produtoId, 1, "-0.01"],
      ),
      CHECK_VIOLATION,
    );
  });

  it("rejects a negative ItemPedido.subtotal", async () => {
    const { pedidoId, produtoId } = await criarPedidoComProduto();
    await expectPostgresError(
      client.query(
        'INSERT INTO "ItemPedido" ("id", "pedidoId", "produtoId", "quantidade", "subtotal") VALUES ($1, $2, $3, $4, $5)',
        [randomUUID(), pedidoId, produtoId, 1, "-0.01"],
      ),
      CHECK_VIOLATION,
    );
  });

  it("rejects a negative ItemCarrinho.precoUnitario", async () => {
    const artesaoId = await criarUsuarioArtesao(client);
    const categoriaId = await criarCategoria(client);
    const compradorId = await criarUsuarioComprador(client);
    const produtoId = await criarProduto(client, { artesaoId, categoriaId });
    await client.query('INSERT INTO "Carrinho" ("usuarioId", "atualizadoEm") VALUES ($1, now())', [
      compradorId,
    ]);
    await expectPostgresError(
      client.query(
        'INSERT INTO "ItemCarrinho" ("id", "carrinhoId", "produtoId", "quantidade", "precoUnitario") VALUES ($1, $2, $3, $4, $5)',
        [randomUUID(), compradorId, produtoId, 1, "-0.01"],
      ),
      CHECK_VIOLATION,
    );
  });

  it("rejects a negative Pedido.total", async () => {
    const compradorId = await criarUsuarioComprador(client);
    await expectPostgresError(
      client.query(
        'INSERT INTO "Pedido" ("id", "compradorRef", "compradorId", "total") VALUES ($1, $2, $3, $4)',
        [randomUUID(), "comprador-ref-teste", compradorId, "-0.01"],
      ),
      CHECK_VIOLATION,
    );
  });

  it("rejects a Pagamento with valor 0", async () => {
    const { pedidoId } = await criarPedidoComProduto();
    await expectPostgresError(
      client.query(
        'INSERT INTO "Pagamento" ("id", "pedidoId", "valor", "status") VALUES ($1, $2, $3, $4)',
        [randomUUID(), pedidoId, "0.00", "aprovado"],
      ),
      CHECK_VIOLATION,
    );
  });
});

describe("Usuario reconciled with the logical model (BD-02)", () => {
  it("rejects an email that differs from an existing one only by case", async () => {
    const local = `caixa-${randomUUID()}`;
    await client.query(
      'INSERT INTO "Usuario" ("id", "nome", "email", "senhaHash") VALUES ($1, $2, $3, $4)',
      [randomUUID(), "Primeiro usuario", `${local}@teste.origem`, "hash-de-teste"],
    );
    await expectPostgresError(
      client.query(
        'INSERT INTO "Usuario" ("id", "nome", "email", "senhaHash") VALUES ($1, $2, $3, $4)',
        [randomUUID(), "Segundo usuario", `${local.toUpperCase()}@Teste.Origem`, "hash-de-teste"],
      ),
      UNIQUE_VIOLATION,
    );
  });

  it("rejects an empty senhaHash", async () => {
    await expectPostgresError(
      client.query(
        'INSERT INTO "Usuario" ("id", "nome", "email", "senhaHash") VALUES ($1, $2, $3, $4)',
        [randomUUID(), "Usuario sem hash", `sem-hash-${randomUUID()}@teste.origem`, ""],
      ),
      CHECK_VIOLATION,
    );
  });
});

describe("Pedido legacy compradorRef (BD-02)", () => {
  it("accepts an order without the legacy compradorRef", async () => {
    const compradorId = await criarUsuarioComprador(client);
    const pedidoId = randomUUID();
    await client.query('INSERT INTO "Pedido" ("id", "compradorId") VALUES ($1, $2)', [
      pedidoId,
      compradorId,
    ]);

    const result = await client.query<{ compradorRef: string | null }>(
      'SELECT "compradorRef" FROM "Pedido" WHERE "id" = $1',
      [pedidoId],
    );
    expect(result.rows[0]?.compradorRef).toBeNull();
  });
});

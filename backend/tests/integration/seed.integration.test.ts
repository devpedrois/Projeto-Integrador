import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { runSeed, seedProductId } from "../../prisma/seed.js";
import { createPrismaClient } from "../../src/database/prisma/client.js";
import { databasePool } from "../helpers/database.js";

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error("DATABASE_URL is required for integration tests");
}

const prisma = createPrismaClient(databaseUrl);

interface ProdutoRow {
  id: string;
  nome: string;
  quantidadeEstoque: number;
}

let previousProduct: ProdutoRow | undefined;

beforeEach(async () => {
  const result = await databasePool.query<ProdutoRow>(
    'SELECT "id", "nome", "quantidadeEstoque" FROM "Produto" WHERE "id" = $1',
    [seedProductId],
  );
  previousProduct = result.rows[0];

  await databasePool.query('DELETE FROM "Produto" WHERE "id" = $1', [
    seedProductId,
  ]);
});

afterEach(async () => {
  await databasePool.query('DELETE FROM "Produto" WHERE "id" = $1', [
    seedProductId,
  ]);

  if (previousProduct !== undefined) {
    await databasePool.query(
      'INSERT INTO "Produto" ("id", "nome", "quantidadeEstoque") VALUES ($1, $2, $3)',
      [
        previousProduct.id,
        previousProduct.nome,
        previousProduct.quantidadeEstoque,
      ],
    );
  }

  previousProduct = undefined;
});

afterAll(async () => {
  await prisma.$disconnect();
  await databasePool.end();
});

describe("database seed", () => {
  it("creates one product with stock one and remains idempotent", async () => {
    await runSeed(prisma);
    await runSeed(prisma);

    const result = await databasePool.query<ProdutoRow>(
      'SELECT "id", "nome", "quantidadeEstoque" FROM "Produto" WHERE "id" = $1',
      [seedProductId],
    );

    expect(result.rows).toEqual([
      {
        id: seedProductId,
        nome: "Produto FCCPD",
        quantidadeEstoque: 1,
      },
    ]);
  });
});

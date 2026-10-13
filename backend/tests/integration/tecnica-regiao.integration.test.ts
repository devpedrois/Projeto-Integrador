import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { PoolClient } from "pg";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { databasePool } from "../helpers/database.js";
import {
  criarCategoria,
  criarProduto,
  criarUsuarioArtesao,
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

function referenciasFrontais(nome: string): Array<{ id: string; nome: string }> {
  const source = readFileSync(
    new URL(`../../../frontend/src/fake-api/seeds/${nome}.seed.ts`, import.meta.url),
    "utf8",
  );
  const ids = new Map(
    [...source.matchAll(/(\w+): "([^"]+)"/g)].map((match) => [match[1], match[2]]),
  );
  return [...source.matchAll(/id: \w+\.(\w+), nome: "([^"]+)"/g)].map((match) => {
    const id = ids.get(match[1]);
    if (id === undefined || match[2] === undefined) {
      throw new Error("Seed frontal invalido");
    }
    return { id, nome: match[2] };
  });
}

describe("BD-03: referencias Tecnica e Regiao no PostgreSQL", () => {
  it.each([["Tecnica", "tecnicas"], ["Regiao", "regioes"]] as const)(
    "%s preserva os mesmos IDs e nomes dos seeds frontais",
    async (tabela, seed) => {
      const result = await client.query<{ id: string; nome: string }>(
        `SELECT "id", "nome" FROM "${tabela}" ORDER BY "id"`,
      );
      expect(result.rows).toEqual(
        referenciasFrontais(seed).sort((a, b) => a.id.localeCompare(b.id)),
      );
    },
  );

  it("resolve tecnica e regiao de todos os produtos existentes", async () => {
    const result = await client.query<{ semTecnica: number; semRegiao: number }>(`
      SELECT count(*) FILTER (WHERE t."id" IS NULL)::int AS "semTecnica",
             count(*) FILTER (WHERE r."id" IS NULL)::int AS "semRegiao"
      FROM "Produto" p
      LEFT JOIN "Tecnica" t ON t."id" = p."tecnicaId"
      LEFT JOIN "PerfilArtesao" pa ON pa."usuarioId" = p."artesaoId"
      LEFT JOIN "Regiao" r ON r."id" = pa."regiaoId"
    `);
    expect(result.rows[0]).toEqual({ semTecnica: 0, semRegiao: 0 });
  });

  it("bloqueia exclusao de tecnica referenciada por produto", async () => {
    const artesaoId = await criarUsuarioArtesao(client);
    const categoriaId = await criarCategoria(client);
    await criarProduto(client, { artesaoId, categoriaId });
    await expectPostgresError(
      client.query('DELETE FROM "Tecnica" WHERE "id" = $1', ["tecnica-modelagem-argila"]),
      "23001",
    );
  });

  it.each([
    ["tecnicaPrincipalId", "tecnica-marcenaria-artesanal", "Tecnica"],
    ["regiaoId", "regiao-tracunhaem", "Regiao"],
  ] as const)("bloqueia exclusao da referencia %s do perfil", async (campo, id, tabela) => {
    const artesaoId = await criarUsuarioArtesao(client);
    await client.query(
      `INSERT INTO "PerfilArtesao" ("usuarioId", "${campo}") VALUES ($1, $2)`,
      [artesaoId, id],
    );
    await expectPostgresError(
      client.query(`DELETE FROM "${tabela}" WHERE "id" = $1`, [id]),
      "23001",
    );
  });

  it("rejeita tecnica inexistente em produto", async () => {
    const artesaoId = await criarUsuarioArtesao(client);
    const categoriaId = await criarCategoria(client);
    const produtoId = await criarProduto(client, { artesaoId, categoriaId });
    await expectPostgresError(
      client.query('UPDATE "Produto" SET "tecnicaId" = $1 WHERE "id" = $2', [
        randomUUID(), produtoId,
      ]),
      "23503",
    );
  });

  it("nao aceita produto sem tecnica", async () => {
    const artesaoId = await criarUsuarioArtesao(client);
    const categoriaId = await criarCategoria(client);
    const produtoId = await criarProduto(client, { artesaoId, categoriaId });
    await expectPostgresError(
      client.query('UPDATE "Produto" SET "tecnicaId" = NULL WHERE "id" = $1', [produtoId]),
      "23502",
    );
  });

  it.each(["Tecnica", "Regiao"])("%s exige nome unico", async (tabela) => {
    await expectPostgresError(
      client.query(
        `INSERT INTO "${tabela}" ("id", "nome") SELECT $1, "nome" FROM "${tabela}" LIMIT 1`,
        [randomUUID()],
      ),
      "23505",
    );
  });

  it("remove textos legados e mantem regiao somente no perfil", async () => {
    const result = await client.query(`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND ((table_name = 'PerfilArtesao' AND column_name IN ('tecnicaPrincipal', 'regiao'))
          OR (table_name = 'Produto' AND column_name IN ('regiao', 'regiaoId')))
    `);
    expect(result.rows).toEqual([]);
  });
});

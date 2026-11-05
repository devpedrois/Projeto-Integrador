import type { PoolClient } from "pg";
import { afterAll, afterEach, beforeEach, expect, it } from "vitest";
import { databasePool } from "../helpers/database.js";
import {
  criarPedido,
  criarUsuarioComprador,
} from "../helpers/dominio-fixtures.js";

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

it("persiste pedido somente com a identidade real do comprador", async () => {
  const compradorId = await criarUsuarioComprador(client);
  const pedidoId = await criarPedido(client, { compradorId });
  const resultado = await client.query('SELECT * FROM "Pedido" WHERE "id" = $1', [
    pedidoId,
  ]);

  expect(resultado.rows).toHaveLength(1);
  expect(Object.keys(resultado.rows[0]).sort()).toEqual([
    "compradorId",
    "criadoEm",
    "id",
    "numero",
    "status",
    "total",
  ]);
  expect(resultado.rows[0]).toMatchObject({ id: pedidoId, compradorId });
});

import { afterAll, expect, it } from "vitest";
import { databasePool } from "../helpers/database.js";

afterAll(async () => databasePool.end());

it("preserva exatamente as colunas das views do contrato de recomendacao", async () => {
  const result = await databasePool.query<{
    table_name: string;
    column_name: string;
  }>(`
    SELECT c.table_name, c.column_name FROM information_schema.columns c
    JOIN information_schema.views v
      ON v.table_schema=c.table_schema AND v.table_name=c.table_name
    WHERE c.table_schema = current_schema()
      AND c.table_name IN ('rec_produtos_elegiveis', 'rec_compras_confirmadas')
    ORDER BY c.table_name, c.ordinal_position
  `);
  expect(result.rows).toEqual([
    ...["compradorId", "produtoId"].map((column_name) => ({
      table_name: "rec_compras_confirmadas",
      column_name,
    })),
    ...[
      "id",
      "categoriaId",
      "regiaoId",
      "vendas",
      "notaMedia",
      "elegivel",
      "visivel",
    ].map((column_name) => ({
      table_name: "rec_produtos_elegiveis",
      column_name,
    })),
  ]);
});

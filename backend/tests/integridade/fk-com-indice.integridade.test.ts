/**
 * Ative MODO_ESTRITO caso o professor rejeite prefixos de índices compostos.
 * Nesse modo, as colunas-chave do índice devem coincidir exatamente com a FK.
 */
import { afterAll, expect, it } from "vitest";
import { databasePool } from "../helpers/database.js";

const MODO_ESTRITO = false;

interface CoberturaFk {
  tabela: string;
  colunas: string[];
  coberta: boolean;
}

afterAll(async () => databasePool.end());

it("exige índice para toda FK no schema dos testes", async () => {
  const resultado = await databasePool.query<CoberturaFk>(
    `
      SELECT tabela.relname AS tabela,
             ARRAY(
               SELECT coluna.attname::text
               FROM unnest(fk.conkey) WITH ORDINALITY AS chave(numero, posicao)
               JOIN pg_attribute coluna
                 ON coluna.attrelid = fk.conrelid
                AND coluna.attnum = chave.numero
               ORDER BY chave.posicao
             ) AS colunas,
             EXISTS (
               SELECT 1
               FROM pg_index indice
               WHERE indice.indrelid = fk.conrelid
                 AND indice.indisvalid
                 AND indice.indisready
                 AND indice.indpred IS NULL
                 AND indice.indnkeyatts >= cardinality(fk.conkey)
                 AND (NOT $1::boolean OR indice.indnkeyatts = cardinality(fk.conkey))
                 AND ARRAY(
                   SELECT chave.numero
                   FROM unnest(indice.indkey) WITH ORDINALITY AS chave(numero, posicao)
                   WHERE chave.posicao <= cardinality(fk.conkey)
                   ORDER BY chave.posicao
                 ) = fk.conkey
             ) AS coberta
      FROM pg_constraint fk
      JOIN pg_class tabela ON tabela.oid = fk.conrelid
      JOIN pg_namespace esquema ON esquema.oid = tabela.relnamespace
      WHERE fk.contype = 'f'
        AND esquema.nspname = current_schema()
      ORDER BY tabela.relname, fk.conname
    `,
    [MODO_ESTRITO],
  );

  expect(
    resultado.rows.length,
    "Nenhuma FK encontrada no schema dos testes",
  ).toBeGreaterThan(0);

  const semIndice = resultado.rows
    .filter((fk) => !fk.coberta)
    .flatMap((fk) => fk.colunas.map((coluna) => `${fk.tabela}.${coluna}`));

  expect(semIndice, `FKs sem índice:\n${semIndice.join("\n")}`).toEqual([]);
});

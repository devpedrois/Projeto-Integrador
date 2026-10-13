import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import type { PoolClient } from "pg";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { databasePool } from "../helpers/database.js";

const migrationName = "20261013230000_tecnica_regiao_referencias";
const migrationsRoot = new URL("../../prisma/migrations/", import.meta.url);
let client: PoolClient;
let schemaName: string;
const perfilId = "a0000000-0000-4000-8000-000000000002";
const categoriaId = "c0000000-0000-4000-8000-000000000001";

beforeEach(async () => {
  client = await databasePool.connect();
  schemaName = `bd03_${randomUUID().replaceAll("-", "")}`;
  await client.query(`BEGIN; CREATE SCHEMA "${schemaName}"; SET LOCAL search_path TO "${schemaName}"`);
  const previousMigrations = readdirSync(migrationsRoot)
    .filter((name) => /^\d/.test(name) && name < migrationName)
    .sort();
  for (const name of previousMigrations) {
    await client.query(readFileSync(new URL(`${name}/migration.sql`, migrationsRoot), "utf8"));
  }
  await client.query(`INSERT INTO "Usuario" ("id", "nome", "email", "senhaHash", "papel") VALUES ($1, 'Artesao sintetico', 'bd03@teste.origem', 'hash-sintetico', 'artesao')`, [perfilId]);
  await client.query('INSERT INTO "PerfilArtesao" ("usuarioId", "tecnicaPrincipal", "regiao") VALUES ($1, $2, $3)', [perfilId, "  CERÂMICA   EM BARRO  ", " Recife - Comunidade do Pilar "]);
  await client.query('INSERT INTO "Categoria" ("id", "nome") VALUES ($1, $2)', [categoriaId, "Categoria sintetica"]);
  for (let indice = 1; indice <= 9; indice += 1) {
    await client.query(`INSERT INTO "Produto" ("id", "nome", "descricao", "preco", "artesaoId", "categoriaId", "quantidadeEstoque") VALUES ($1, $2, 'Descricao sintetica', 10, $3, $4, 1)`, [`b0000000-0000-4000-8000-${String(indice).padStart(12, "0")}`, `Produto ${indice}`, perfilId, categoriaId]);
  }
}, 15000);

afterEach(async () => {
  await client.query("ROLLBACK");
  client.release();
});

afterAll(async () => {
  await databasePool.end();
});

function migrationBody(): string {
  return readFileSync(new URL(`${migrationName}/migration.sql`, migrationsRoot), "utf8")
    .replace(/^BEGIN;\s*/, "")
    .replace(/COMMIT;\s*$/, "");
}

describe("BD-03: migracao dos textos legados", () => {
  it("converte textos normalizados e preserva os nove produtos", async () => {
    await client.query(migrationBody());
    const perfil = await client.query('SELECT "tecnicaPrincipalId", "regiaoId" FROM "PerfilArtesao"');
    expect(perfil.rows).toEqual([{
      tecnicaPrincipalId: "tecnica-modelagem-argila",
      regiaoId: "regiao-pilar-recife",
    }]);
    const produtos = await client.query('SELECT "tecnicaId" FROM "Produto" ORDER BY "id"');
    expect(produtos.rows.map((row: { tecnicaId: string }) => row.tecnicaId)).toEqual([
      "tecnica-torno-ceramico", "tecnica-modelagem-argila", "tecnica-renda-irlandesa",
      "tecnica-bordado-mao", "tecnica-entalhe-madeira", "tecnica-costura-autoral",
      "tecnica-bijuteria-sementes", "tecnica-tecelagem-manual", "tecnica-trancado-fibra",
    ]);
  });

  it.each([
    ["Marcenaria e renda", "Caruaru - Alto do Moura", "tecnica-marcenaria-artesanal", "regiao-alto-moura-caruaru"],
    [" BORDADO À MÃO ", "TRACUNHAÉM", "tecnica-bordado-mao", "regiao-tracunhaem"],
    [null, null, null, null],
  ])("converte %s e %s sem preencher campos ausentes", async (tecnica, regiao, tecnicaId, regiaoId) => {
    await client.query('UPDATE "PerfilArtesao" SET "tecnicaPrincipal" = $1, "regiao" = $2', [tecnica, regiao]);
    await client.query(migrationBody());
    const result = await client.query('SELECT "tecnicaPrincipalId", "regiaoId" FROM "PerfilArtesao"');
    expect(result.rows).toEqual([{ tecnicaPrincipalId: tecnicaId, regiaoId }]);
  });

  it.each(["tecnicaPrincipal", "regiao"])("aborta e preserva textos quando %s e desconhecida", async (campo) => {
    await client.query(`UPDATE "PerfilArtesao" SET "${campo}" = $1`, ["Texto desconhecido"]);
    await client.query("SAVEPOINT tentativa");
    await expect(client.query(migrationBody())).rejects.toMatchObject({
      code: "P0001",
      message: expect.stringContaining("Texto desconhecido"),
    });
    await client.query("ROLLBACK TO SAVEPOINT tentativa");
    const result = await client.query(`SELECT "${campo}" FROM "PerfilArtesao"`);
    expect(result.rows[0]?.[campo]).toBe("Texto desconhecido");
    const tabelas = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name IN ('Tecnica', 'Regiao')", [schemaName]);
    expect(tabelas.rows).toEqual([]);
  });

  it("aborta para produto sem mapeamento explicito", async () => {
    const id = randomUUID();
    await client.query(`INSERT INTO "Produto" ("id", "nome", "descricao", "preco", "artesaoId", "categoriaId", "quantidadeEstoque") VALUES ($1, 'Produto desconhecido', 'Descricao', 10, $2, $3, 1)`, [id, perfilId, categoriaId]);
    await expect(client.query(migrationBody())).rejects.toMatchObject({
      code: "P0001",
      message: expect.stringContaining(id),
    });
  });
});

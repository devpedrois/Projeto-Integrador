import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import type { PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { databasePool } from "../helpers/database.js";

const migrationsRoot = new URL("../../prisma/migrations/", import.meta.url);
const migrationName = "20261014010000_indices_consultas";
const migrationPath = new URL(`${migrationName}/migration.sql`, migrationsRoot);
const queriesRoot = new URL("../../prisma/consultas/", import.meta.url);
const schema = `bd04_test_${randomUUID().replaceAll("-", "")}`;
let client: PoolClient;
const comprador = "a0000000-0000-4000-8000-000000000001";
const artesao = "a0000000-0000-4000-8000-000000000002";
const outroComprador = "a0000000-0000-4000-8000-000000000003";
const categoria = "c0000000-0000-4000-8000-000000000001";
const produtoId = (n: number) =>
  `b0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const pedidoId = (n: number) =>
  `d0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

beforeAll(async () => {
  client = await databasePool.connect();
  await client.query("BEGIN");
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.query(`SET LOCAL search_path TO "${schema}", public`);
  for (const name of readdirSync(migrationsRoot)
    .filter((n) => /^\d/.test(n) && n < migrationName)
    .sort()) {
    await client.query(
      readFileSync(new URL(`${name}/migration.sql`, migrationsRoot), "utf8")
        .replace(/^BEGIN;\s*/, "")
        .replace(/COMMIT;\s*$/, ""),
    );
  }
  if (existsSync(migrationPath))
    await client.query(
      readFileSync(migrationPath, "utf8")
        .replace(/^BEGIN;\s*/, "")
        .replace(/COMMIT;\s*$/, ""),
    );
  await client.query(
    `INSERT INTO "Usuario" (id, nome, email, "senhaHash", papel) VALUES
    ($1, 'Comprador', 'comprador@bd04.test', 'sintetico', 'comprador'),
    ($2, 'Artesao', 'artesao@bd04.test', 'sintetico', 'artesao'),
    ($3, 'Outro', 'outro@bd04.test', 'sintetico', 'comprador')`,
    [comprador, artesao, outroComprador],
  );
  await client.query(
    `INSERT INTO "PerfilArtesao" ("usuarioId", "regiaoId") VALUES ($1, 'regiao-tracunhaem')`,
    [artesao],
  );
  await client.query(
    `INSERT INTO "Categoria" (id, nome) VALUES ($1, 'Categoria BD04')`,
    [categoria],
  );
  for (let n = 1; n <= 6; n++) {
    await client.query(
      `INSERT INTO "Produto" (id, nome, descricao, preco, "quantidadeEstoque", "artesaoId", "categoriaId", "tecnicaId", ativo, "desativadoPorAdmin", "criadoEm")
      VALUES ($1, $2, $3, 10, $4, $5, $6, 'tecnica-modelagem-argila', $7, $8, $9)`,
      [
        produtoId(n),
        n === 1 ? "Vaqueiro" : "Peça",
        n === 2 ? "VAQUEIRO em barro" : "Descricao sintetica",
        n === 5 ? 0 : 5,
        artesao,
        categoria,
        n !== 3,
        n === 4,
        new Date(`2026-08-0${n}T00:00:00Z`),
      ],
    );
  }
  for (let n = 1; n <= 3; n++) {
    await client.query(
      `INSERT INTO "Pedido" (id, "compradorId", "criadoEm") VALUES ($1, $2, $3)`,
      [
        pedidoId(n),
        n === 3 ? outroComprador : comprador,
        new Date(`2026-09-0${n}T00:00:00Z`),
      ],
    );
    await client.query(
      `INSERT INTO "IntencaoNotificacao" (id, "pedidoId", status, "atualizadoEm") VALUES ($1, $2, $3, now())`,
      [
        randomUUID(),
        pedidoId(n),
        n === 1 ? "pendente" : n === 2 ? "falha" : "processada",
      ],
    );
    await client.query(
      `INSERT INTO "Notificacao" (id, "usuarioId", "pedidoId", tipo, lida, "criadoEm") VALUES ($1, $2, $3, 'novo_pedido', $4, $5)`,
      [
        randomUUID(),
        n === 3 ? outroComprador : artesao,
        pedidoId(n),
        n === 2,
        new Date(`2026-09-0${n}T00:00:00Z`),
      ],
    );
  }
  await client.query(
    `INSERT INTO "Carrinho" ("usuarioId", "atualizadoEm") VALUES ($1, now())`,
    [comprador],
  );
  await client.query(
    `INSERT INTO "ItemCarrinho" (id, "carrinhoId", "produtoId", quantidade, "precoUnitario") VALUES ($1, $2, $3, 1, 10)`,
    [randomUUID(), comprador, produtoId(1)],
  );
}, 30000);

afterAll(async () => {
  if (client !== undefined) {
    await client.query("ROLLBACK");
    client.release();
  }
  await databasePool.end();
});

async function executar(nome: string, values: unknown[] = []) {
  const path = new URL(`${nome}.sql`, queriesRoot);
  expect(existsSync(path), `Consulta ${nome} ausente`).toBe(true);
  return client.query<{ id: string; pedidoId?: string }>(
    readFileSync(path, "utf8"),
    values,
  );
}

describe("BD-04 em PostgreSQL real", () => {
  it("aplica indices completos e substitui o simples de pedidos", async () => {
    const indexes = await client.query<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = $1`,
      [schema],
    );
    const names = indexes.rows.map((r) => r.indexname);
    expect(names).toEqual(
      expect.arrayContaining([
        "Produto_vitrine_criadoEm_idx",
        "Produto_nome_trgm_idx",
        "Produto_descricao_trgm_idx",
        "Produto_categoriaId_idx",
        "Produto_tecnicaId_idx",
        "PerfilArtesao_regiaoId_idx",
        "Pedido_compradorId_criadoEm_idx",
        "IntencaoNotificacao_status_idx",
        "Notificacao_usuarioId_lida_criadoEm_idx",
        "ItemCarrinho_carrinhoId_produtoId_key",
      ]),
    );
    expect(names).not.toContain("Pedido_compradorId_idx");
    expect(names).not.toContain("ItemCarrinho_carrinhoId_idx");
    expect(
      indexes.rows.find((r) => r.indexname === "Produto_vitrine_criadoEm_idx")
        ?.indexdef,
    ).toMatch(/WHERE.*ativo.*NOT.*desativadoPorAdmin.*quantidadeEstoque/);
    expect(
      indexes.rows.find(
        (r) => r.indexname === "Pedido_compradorId_criadoEm_idx",
      )?.indexdef,
    ).toContain('"criadoEm" DESC');
    expect(
      indexes.rows
        .filter((r) => r.indexname.endsWith("_trgm_idx"))
        .every((r) => /USING gin.*gin_trgm_ops/.test(r.indexdef)),
    ).toBe(true);
  });

  it("vitrine exclui inativos, moderados e estoque zero", async () => {
    expect((await executar("vitrine-publica")).rows.map((r) => r.id)).toEqual([
      produtoId(6),
      produtoId(2),
      produtoId(1),
    ]);
  });

  it("busca encontra nome e descricao sem diferenciar caixa", async () => {
    expect(
      (await executar("busca-termo", ["%vaqueiro%"])).rows.map((r) => r.id),
    ).toEqual([produtoId(2), produtoId(1)]);
    expect((await executar("busca-termo", ["%'; DROP TABLE%"])).rows).toEqual(
      [],
    );
  });

  it.each([
    ["filtro-categoria", categoria],
    ["filtro-tecnica", "tecnica-modelagem-argila"],
    ["filtro-regiao", "regiao-tracunhaem"],
  ] as const)("%s preserva visibilidade e ordenacao", async (nome, valor) => {
    expect((await executar(nome, [valor])).rows.map((r) => r.id)).toEqual([
      produtoId(6),
      produtoId(2),
      produtoId(1),
    ]);
    expect(
      (
        await executar(nome, [
          nome === "filtro-categoria" ? randomUUID() : "inexistente",
        ])
      ).rows,
    ).toEqual([]);
  });

  it("meus pedidos exclui terceiros e ordena por data", async () => {
    expect(
      (await executar("meus-pedidos", [comprador])).rows.map((r) => r.id),
    ).toEqual([pedidoId(2), pedidoId(1)]);
  });

  it("poller recupera somente pendentes e falhas", async () => {
    expect(
      (await executar("poller-fila")).rows.map((r) => r.pedidoId).sort(),
    ).toEqual([pedidoId(1), pedidoId(2)]);
  });

  it("notificacoes restringem usuario e estado de leitura", async () => {
    expect(
      (await executar("notificacoes-artesao", [artesao, false])).rows.map(
        (r) => r.pedidoId,
      ),
    ).toEqual([pedidoId(1)]);
    expect(
      (await executar("notificacoes-artesao", [artesao, true])).rows.map(
        (r) => r.pedidoId,
      ),
    ).toEqual([pedidoId(2)]);
  });

  it("carrinho usa o prefixo do unique sem indice redundante", async () => {
    expect((await executar("itens-carrinho", [comprador])).rows).toHaveLength(
      1,
    );
    expect((await executar("itens-carrinho", [outroComprador])).rows).toEqual(
      [],
    );
  });
});

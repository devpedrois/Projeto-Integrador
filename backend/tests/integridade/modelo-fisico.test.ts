import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { databasePool } from "../helpers/database.js";
import {
  criarCategoria,
  criarUsuarioArtesao,
  criarUsuarioComprador,
} from "../helpers/dominio-fixtures.js";

interface DadosIntegridade {
  artesaoId: string;
  compradorId: string;
  categoriaId: string;
  tecnicaId: string;
  produtoId: string;
  pedidoId: string;
  itemId: string;
  pagamentoId: string;
  avaliacaoId: string;
  notificacaoId: string;
  duplicadoId: string;
}

let client: PoolClient | undefined;
let dados: DadosIntegridade;
const idsCriados: string[] = [];

function conexao(): PoolClient {
  if (client === undefined) throw new Error("Conexao BD-07 indisponivel");
  return client;
}

async function prepararDados(): Promise<DadosIntegridade> {
  const db = conexao();
  const artesaoId = await criarUsuarioArtesao(db);
  idsCriados.push(artesaoId);
  const compradorId = await criarUsuarioComprador(db);
  idsCriados.push(compradorId);
  const categoriaId = await criarCategoria(db);
  idsCriados.push(categoriaId);
  const tecnicaId = randomUUID();
  const produtoId = randomUUID();
  const pedidoId = randomUUID();
  const itemId = randomUUID();
  const pagamentoId = randomUUID();
  const avaliacaoId = randomUUID();
  const notificacaoId = randomUUID();
  const duplicadoId = randomUUID();
  idsCriados.push(
    tecnicaId,
    produtoId,
    pedidoId,
    itemId,
    pagamentoId,
    avaliacaoId,
    notificacaoId,
    duplicadoId,
  );

  await db.query('INSERT INTO "Tecnica" ("id", "nome") VALUES ($1, $2)', [
    tecnicaId,
    `Tecnica BD-07 ${tecnicaId}`,
  ]);
  await db.query(
    `INSERT INTO "Produto"
      ("id", "nome", "descricao", "artesaoId", "categoriaId", "tecnicaId", "preco", "quantidadeEstoque")
     VALUES ($1, 'Produto BD-07', 'Descricao sintetica', $2, $3, $4, 10.00, 0)`,
    [produtoId, artesaoId, categoriaId, tecnicaId],
  );
  await db.query(
    'INSERT INTO "Pedido" ("id", "compradorId", "numero", "total") VALUES ($1, $2, $3, 10.00)',
    [pedidoId, compradorId, `BD07-${pedidoId}`],
  );
  await db.query(
    `INSERT INTO "ItemPedido" ("id", "pedidoId", "produtoId", "quantidade", "precoUnitario", "subtotal")
     VALUES ($1, $2, $3, 1, 10.00, 10.00)`,
    [itemId, pedidoId, produtoId],
  );
  await db.query(
    'INSERT INTO "Pagamento" ("id", "pedidoId", "valor", "status") VALUES ($1, $2, 10.00, \'aprovado\')',
    [pagamentoId, pedidoId],
  );
  await db.query(
    'INSERT INTO "Avaliacao" ("id", "compradorId", "produtoId", "nota") VALUES ($1, $2, $3, 5)',
    [avaliacaoId, compradorId, produtoId],
  );
  await db.query(
    `INSERT INTO "Notificacao" ("id", "usuarioId", "pedidoId", "tipo")
     VALUES ($1, $2, $3, 'novo_pedido')`,
    [notificacaoId, artesaoId, pedidoId],
  );
  return {
    artesaoId,
    compradorId,
    categoriaId,
    tecnicaId,
    produtoId,
    pedidoId,
    itemId,
    pagamentoId,
    avaliacaoId,
    notificacaoId,
    duplicadoId,
  };
}

beforeEach(async () => {
  idsCriados.length = 0;
  client = await databasePool.connect();
  await client.query("BEGIN");
  dados = await prepararDados();
}, 15000);

afterEach(async () => {
  if (client === undefined) return;
  let rollbackConcluido = false;
  try {
    await client.query("ROLLBACK");
    rollbackConcluido = true;
    const residuos = await client.query<{ total: number }>(
      `SELECT (
        (SELECT count(*) FROM "Usuario" WHERE "id" = ANY($1::uuid[])) +
        (SELECT count(*) FROM "Categoria" WHERE "id" = ANY($1::uuid[])) +
        (SELECT count(*) FROM "Tecnica" WHERE "id" = ANY($1::text[])) +
        (SELECT count(*) FROM "Produto" WHERE "id" = ANY($1::uuid[])) +
        (SELECT count(*) FROM "Pedido" WHERE "id" = ANY($1::uuid[])) +
        (SELECT count(*) FROM "ItemPedido" WHERE "id" = ANY($1::uuid[])) +
        (SELECT count(*) FROM "Pagamento" WHERE "id" = ANY($1::uuid[])) +
        (SELECT count(*) FROM "Avaliacao" WHERE "id" = ANY($1::uuid[])) +
        (SELECT count(*) FROM "Notificacao" WHERE "id" = ANY($1::uuid[]))
      )::int AS total`,
      [idsCriados],
    );
    expect(residuos.rows[0]?.total, "Dados residuais apos rollback BD-07").toBe(
      0,
    );
  } finally {
    client.release(!rollbackConcluido);
    client = undefined;
  }
}, 15000);

afterAll(async () => {
  await databasePool.end();
});

describe("BD-07: integridade do modelo fisico", () => {
  it("rejeita estoque negativo com 23514", async () => {
    await expect(
      conexao().query(
        'UPDATE "Produto" SET "quantidadeEstoque" = -1 WHERE "id" = $1',
        [dados.produtoId],
      ),
    ).rejects.toMatchObject({
      code: "23514",
      constraint: "Produto_quantidadeEstoque_check",
    });
  });

  it.each(["0.00", "-0.01"])("rejeita preco %s com 23514", async (preco) => {
    await expect(
      conexao().query('UPDATE "Produto" SET "preco" = $1 WHERE "id" = $2', [
        preco,
        dados.produtoId,
      ]),
    ).rejects.toMatchObject({
      code: "23514",
      constraint: "Produto_preco_check",
    });
  });

  it("rejeita nota 6 com 23514", async () => {
    await expect(
      conexao().query('UPDATE "Avaliacao" SET "nota" = 6 WHERE "id" = $1', [
        dados.avaliacaoId,
      ]),
    ).rejects.toMatchObject({
      code: "23514",
      constraint: "Avaliacao_nota_check",
    });
  });

  it("rejeita email duplicado com caixa diferente com 23505", async () => {
    await expect(
      conexao().query(
        `INSERT INTO "Usuario" ("id", "nome", "email", "senhaHash")
         SELECT $1, "nome", upper("email"), "senhaHash" FROM "Usuario" WHERE "id" = $2`,
        [dados.duplicadoId, dados.compradorId],
      ),
    ).rejects.toMatchObject({
      code: "23505",
      constraint: "Usuario_email_lower_key",
    });
  });

  it("restringe exclusao de produto com pedido com 23001", async () => {
    await conexao().query('DELETE FROM "Avaliacao" WHERE "id" = $1', [
      dados.avaliacaoId,
    ]);
    await expect(
      conexao().query('DELETE FROM "Produto" WHERE "id" = $1', [
        dados.produtoId,
      ]),
    ).rejects.toMatchObject({
      code: "23001",
      constraint: "ItemPedido_produtoId_fkey",
    });
  });

  it("rejeita dois pagamentos para o mesmo pedido com 23505", async () => {
    await expect(
      conexao().query(
        'INSERT INTO "Pagamento" ("id", "pedidoId", "valor", "status") VALUES ($1, $2, 10.00, \'aprovado\')',
        [dados.duplicadoId, dados.pedidoId],
      ),
    ).rejects.toMatchObject({
      code: "23505",
      constraint: "Pagamento_pedidoId_key",
    });
  });

  it("rejeita notificacao duplicada com 23505", async () => {
    await expect(
      conexao().query(
        `INSERT INTO "Notificacao" ("id", "usuarioId", "pedidoId", "tipo")
         VALUES ($1, $2, $3, 'novo_pedido')`,
        [dados.duplicadoId, dados.artesaoId, dados.pedidoId],
      ),
    ).rejects.toMatchObject({
      code: "23505",
      constraint: "Notificacao_usuarioId_pedidoId_tipo_key",
    });
  });

  it("restringe exclusao de Tecnica referenciada com 23001", async () => {
    await expect(
      conexao().query('DELETE FROM "Tecnica" WHERE "id" = $1', [
        dados.tecnicaId,
      ]),
    ).rejects.toMatchObject({
      code: "23001",
      constraint: "Produto_tecnicaId_fkey",
    });
  });
});

import type { Client } from "pg";

const tabelas = [
  "avaliacoes",
  "carrinhos",
  "categorias",
  "intencoes_notificacao",
  "itens_carrinho",
  "itens_pedido",
  "notificacoes",
  "pagamentos",
  "pedidos",
  "perfis_artesao",
  "produto_fotos",
  "produtos",
  "regioes",
  "tecnicas",
  "usuarios",
] as const;

export async function auditarCatalogo(
  cliente: Client,
  registrar: (linha: string) => void,
) {
  const lista = await cliente.query<{ tabela: string; pk: boolean }>(`
    SELECT c.relname AS tabela, EXISTS (
      SELECT 1 FROM pg_constraint k WHERE k.conrelid = c.oid AND k.contype = 'p'
    ) AS pk
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'origem' AND c.relkind IN ('r','p')`);
  const porNome = new Map(lista.rows.map((r) => [r.tabela, r.pk]));
  if (porNome.size !== tabelas.length || tabelas.some((t) => !porNome.has(t)))
    throw new FalhaValidacao(
      "Inventário origem divergente: " + porNome.size + "/15 tabelas.",
    );

  for (const tabela of tabelas) {
    if (!porNome.get(tabela))
      throw new FalhaValidacao("PK ausente em " + tabela);
    const linhas = await cliente.query<{ total: string }>(
      "SELECT count(*) AS total FROM origem." + tabela,
    );
    const total = Number(linhas.rows[0]?.total);
    registrar(tabela + ": " + total + " linha(s)");
    if (!(total >= 3))
      throw new FalhaValidacao("Mínimo de três linhas: " + tabela);
  }

  const problemas = await cliente.query<{
    nomes: string;
    acoes: string;
    indices: string;
  }>(`
    WITH regras AS (
      SELECT k.* FROM pg_constraint k JOIN pg_class t ON t.oid = k.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace WHERE n.nspname = 'origem'
    )
    SELECT count(*) FILTER (WHERE NOT CASE contype
        WHEN 'p' THEN starts_with(conname, 'pk_') WHEN 'f' THEN starts_with(conname, 'fk_')
        WHEN 'u' THEN starts_with(conname, 'uq_') WHEN 'c' THEN starts_with(conname, 'ck_')
        ELSE false END) AS nomes,
      count(*) FILTER (WHERE contype = 'f' AND confdeltype NOT IN ('r','c','n')) AS acoes,
      count(*) FILTER (WHERE contype = 'f' AND NOT EXISTS (
        SELECT 1 FROM pg_index i WHERE i.indrelid = regras.conrelid
          AND i.indisvalid AND i.indisready AND i.indpred IS NULL
          AND i.indnkeyatts >= cardinality(regras.conkey)
          AND NOT EXISTS (
            SELECT 1 FROM unnest(regras.conkey) WITH ORDINALITY AS fk(col, pos)
            WHERE i.indkey[fk.pos::int - 1] IS DISTINCT FROM fk.col
          )
      )) AS indices
    FROM regras`);
  const falhas = problemas.rows[0];
  if (!falhas || Object.values(falhas).some((n) => n !== "0"))
    throw new FalhaValidacao(
      "Catálogo inválido: nomes=" +
        falhas?.nomes +
        ", ações DELETE=" +
        falhas?.acoes +
        ", FKs sem índice=" +
        falhas?.indices,
    );
  registrar(
    "Catálogo: 15 tabelas, PKs, ações DELETE, nomes e índices conferidos.",
  );
}

export class FalhaValidacao extends Error {}

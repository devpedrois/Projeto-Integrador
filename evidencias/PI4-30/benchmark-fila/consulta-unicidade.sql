WITH alvo AS (
  SELECT id, "pedidoId", status, tentativas
  FROM "IntencaoNotificacao"
  WHERE "pedidoId" = ANY($1::uuid[])
), avisos AS (
  SELECT notificacao."usuarioId", notificacao."pedidoId", notificacao.tipo
  FROM "Notificacao" notificacao
  JOIN alvo ON alvo."pedidoId" = notificacao."pedidoId"
), esperados AS (
  SELECT DISTINCT produto."artesaoId" AS "usuarioId", item."pedidoId",
    'novo_pedido'::text AS tipo
  FROM "ItemPedido" item
  JOIN "Produto" produto ON produto.id = item."produtoId"
  JOIN alvo ON alvo."pedidoId" = item."pedidoId"
), duplicados AS (
  SELECT "usuarioId", "pedidoId", tipo
  FROM avisos
  GROUP BY "usuarioId", "pedidoId", tipo
  HAVING count(*) > 1
), faltantes AS (
  SELECT "usuarioId", "pedidoId", tipo FROM esperados
  EXCEPT
  SELECT "usuarioId", "pedidoId", tipo::text FROM avisos
), indevidos AS (
  SELECT "usuarioId", "pedidoId", tipo::text FROM avisos
  EXCEPT
  SELECT "usuarioId", "pedidoId", tipo FROM esperados
)
SELECT count(*)::int AS intencoes,
  count(*) FILTER (WHERE status = 'processada')::int AS processadas,
  min(tentativas)::int AS "tentativasMin",
  max(tentativas)::int AS "tentativasMax",
  sum(tentativas)::int AS "tentativasTotal",
  (SELECT count(*)::int FROM avisos) AS notificacoes,
  (SELECT count(*)::int FROM esperados) AS "notificacoesEsperadas",
  (SELECT count(*)::int FROM duplicados) AS duplicadas,
  (SELECT count(*)::int FROM faltantes) AS faltantes,
  (SELECT count(*)::int FROM indevidos) AS indevidas
FROM alvo;

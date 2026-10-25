SELECT COALESCE(SUM(vendas.quantidade), 0)::bigint AS "quantidadeVendida",
       ROUND(COALESCE(SUM(vendas.receita), 0), 2) AS "receitaTotal",
       COUNT(DISTINCT vendas."pedidoId") AS "numeroPedidos",
       MAX(vendas."criadoEm") AS "ultimaVenda",
       statement_timestamp() AS "atualizadoEm"
FROM (
  SELECT item."produtoId", item."pedidoId",
         SUM(item."quantidade") AS quantidade,
         SUM(item."subtotal") AS receita,
         MAX(pedido."criadoEm") AS "criadoEm"
  FROM "ItemPedido" item
  JOIN "Pedido" pedido ON pedido."id" = item."pedidoId"
  WHERE pedido."status" = 'confirmado'
  GROUP BY item."produtoId", item."pedidoId"
) vendas
JOIN "Produto" produto ON produto."id" = vendas."produtoId"
WHERE produto."artesaoId" = $1::uuid;

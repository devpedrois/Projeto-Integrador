SELECT p."id" AS "id"
FROM "Produto" p
JOIN "Usuario" artesao ON artesao."id" = p."artesaoId"
LEFT JOIN (
  SELECT "produtoId", SUM("quantidade") AS "vendas"
  FROM "ItemPedido"
  GROUP BY "produtoId"
) vendas ON vendas."produtoId" = p."id"
LEFT JOIN (
  SELECT "produtoId", AVG("nota") AS "notaMedia"
  FROM "Avaliacao"
  GROUP BY "produtoId"
) notas ON notas."produtoId" = p."id"
WHERE p."ativo" = true
  AND p."desativadoPorAdmin" = false
  AND artesao."ativo" = true
  AND p."quantidadeEstoque" > 0
  AND ($1::uuid IS NULL OR p."id" <> $1::uuid)
  AND NOT EXISTS (
    SELECT 1 FROM "ItemPedido" item
    JOIN "Pedido" pedido ON pedido."id" = item."pedidoId"
    WHERE pedido."compradorId" = $2::uuid
      AND pedido."status" = 'confirmado'
      AND item."produtoId" = p."id"
  )
ORDER BY COALESCE(vendas."vendas", 0) DESC,
         COALESCE(notas."notaMedia", 0) DESC,
         p."id" ASC
LIMIT $3;

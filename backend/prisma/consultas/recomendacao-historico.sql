WITH historico AS (
  SELECT DISTINCT item."produtoId", comprado."categoriaId"
  FROM "Pedido" pedido
  JOIN "ItemPedido" item ON item."pedidoId" = pedido."id"
  JOIN "Produto" comprado ON comprado."id" = item."produtoId"
  WHERE pedido."compradorId" = $1::uuid
    AND pedido."status" = 'confirmado'
)
SELECT p."id" AS "id"
FROM "Produto" p
JOIN "Usuario" artesao ON artesao."id" = p."artesaoId"
LEFT JOIN (
  SELECT "produtoId", SUM("quantidade") AS "vendas"
  FROM "ItemPedido" GROUP BY "produtoId"
) vendas ON vendas."produtoId" = p."id"
LEFT JOIN (
  SELECT "produtoId", AVG("nota") AS "notaMedia"
  FROM "Avaliacao" GROUP BY "produtoId"
) notas ON notas."produtoId" = p."id"
WHERE p."ativo" = true
  AND p."desativadoPorAdmin" = false
  AND p."quantidadeEstoque" > 0
  AND artesao."ativo" = true
  AND EXISTS (SELECT 1 FROM historico WHERE "categoriaId" = p."categoriaId")
  AND NOT EXISTS (SELECT 1 FROM historico WHERE "produtoId" = p."id")
ORDER BY COALESCE(vendas."vendas", 0) DESC,
         COALESCE(notas."notaMedia", 0) DESC,
         p."id" ASC
LIMIT $2;

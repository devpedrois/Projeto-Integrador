SELECT p."id" AS "id"
FROM "Produto" p
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
  AND p."quantidadeEstoque" > 0
  AND p."categoriaId" = $1::uuid
  AND p."id" <> $2::uuid
ORDER BY COALESCE(vendas."vendas", 0) DESC,
         COALESCE(notas."notaMedia", 0) DESC,
         p."id" ASC
LIMIT $3;

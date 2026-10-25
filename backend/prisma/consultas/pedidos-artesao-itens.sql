SELECT item.id, item."pedidoId", item."produtoId", item.quantidade,
       item."precoUnitario", item.subtotal
FROM "ItemPedido" item
LEFT JOIN "Produto" produto ON produto.id = item."produtoId"
WHERE produto."artesaoId" = $1::uuid
  AND produto.id IS NOT NULL
  AND item."pedidoId" = ANY($2::uuid[])
ORDER BY item.id ASC;

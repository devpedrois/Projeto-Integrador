SELECT pedido.id, pedido.numero, pedido."criadoEm", pedido."compradorId"
FROM "Pedido" pedido
WHERE pedido.status = CAST($1::text AS "StatusPedido")
  AND EXISTS (
    SELECT item."pedidoId" FROM "ItemPedido" item
    LEFT JOIN "Produto" produto ON produto.id = item."produtoId"
    WHERE produto."artesaoId" = $2::uuid
      AND produto.id IS NOT NULL
      AND pedido.id = item."pedidoId"
      AND item."pedidoId" IS NOT NULL
  )
ORDER BY pedido."criadoEm" DESC, pedido.id DESC
LIMIT $3 OFFSET $4;

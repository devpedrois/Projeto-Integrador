SELECT pedido."id"
FROM "Pedido" pedido JOIN "ItemPedido" item ON item."pedidoId" = pedido."id"
WHERE pedido."compradorId" = $1::uuid
  AND pedido."status" = 'confirmado' AND item."produtoId" = $2::uuid
LIMIT 1 FOR SHARE OF pedido, item;

SELECT EXISTS (
  SELECT 1 FROM "Pedido" pedido
  JOIN "ItemPedido" item ON item."pedidoId" = pedido."id"
  WHERE pedido."compradorId" = $1::uuid
    AND pedido."status" = 'confirmado' AND item."produtoId" = $2::uuid
) AS comprou,
EXISTS (
  SELECT 1 FROM "Avaliacao"
  WHERE "compradorId" = $1::uuid AND "produtoId" = $2::uuid
) AS avaliou;

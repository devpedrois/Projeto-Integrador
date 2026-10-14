SELECT "id", "produtoId", "quantidade", "precoUnitario"
FROM "ItemCarrinho"
WHERE "carrinhoId" = $1::uuid;

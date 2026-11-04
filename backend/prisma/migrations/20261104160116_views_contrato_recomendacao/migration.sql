-- Contextos e compras antigas precisam continuar consultaveis mesmo ocultos.
-- elegivel preserva categoria; visivel preserva fallback e historico.
CREATE VIEW rec_produtos_elegiveis AS
SELECT p."id", p."categoriaId", pa."regiaoId",
       COALESCE(v."vendas", 0) AS "vendas",
       COALESCE(n."notaMedia", 0) AS "notaMedia",
       (p."ativo" AND p."quantidadeEstoque" > 0) AS "elegivel",
       (p."ativo" AND p."quantidadeEstoque" > 0
        AND NOT p."desativadoPorAdmin" AND u."ativo") AS "visivel"
FROM "Produto" p
JOIN "Usuario" u ON u."id" = p."artesaoId"
LEFT JOIN "PerfilArtesao" pa ON pa."usuarioId" = p."artesaoId"
LEFT JOIN (
  SELECT "produtoId", SUM("quantidade") AS "vendas"
  FROM "ItemPedido" GROUP BY "produtoId"
) v ON v."produtoId" = p."id"
LEFT JOIN (
  SELECT "produtoId", AVG("nota") AS "notaMedia"
  FROM "Avaliacao" GROUP BY "produtoId"
) n ON n."produtoId" = p."id";

CREATE VIEW rec_compras_confirmadas AS
SELECT pedido."compradorId", item."produtoId"
FROM "Pedido" pedido
JOIN "ItemPedido" item ON item."pedidoId" = pedido."id"
WHERE pedido."status" = 'confirmado';

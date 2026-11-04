SELECT 'Usuario' AS tabela, count(*) AS total FROM "Usuario"
UNION ALL SELECT 'PerfilArtesao', count(*) FROM "PerfilArtesao"
UNION ALL SELECT 'Carrinho', count(*) FROM "Carrinho"
UNION ALL SELECT 'ItemCarrinho', count(*) FROM "ItemCarrinho"
UNION ALL SELECT 'Categoria', count(*) FROM "Categoria"
UNION ALL SELECT 'Tecnica', count(*) FROM "Tecnica"
UNION ALL SELECT 'Regiao', count(*) FROM "Regiao"
UNION ALL SELECT 'Produto', count(*) FROM "Produto"
UNION ALL SELECT 'ProdutoFoto', count(*) FROM "ProdutoFoto"
UNION ALL SELECT 'Pedido', count(*) FROM "Pedido"
UNION ALL SELECT 'ItemPedido', count(*) FROM "ItemPedido"
UNION ALL SELECT 'Pagamento', count(*) FROM "Pagamento"
UNION ALL SELECT 'Avaliacao', count(*) FROM "Avaliacao"
UNION ALL SELECT 'IntencaoNotificacao', count(*) FROM "IntencaoNotificacao"
UNION ALL SELECT 'Notificacao', count(*) FROM "Notificacao"
ORDER BY tabela;

SELECT count(*) AS pedidos_confirmados_pagos_multiartesao
FROM (
  SELECT pedido.id
  FROM "Pedido" pedido
  JOIN "ItemPedido" item ON item."pedidoId" = pedido.id
  JOIN "Produto" produto ON produto.id = item."produtoId"
  JOIN "Pagamento" pagamento ON pagamento."pedidoId" = pedido.id
  WHERE pedido.status = 'confirmado'
    AND pagamento.status = 'aprovado'
  GROUP BY pedido.id
  HAVING count(DISTINCT produto."artesaoId") >= 2
) pedidos;

SELECT 'categoria' AS dimensao, categoria.nome, count(produto.id) AS produtos
FROM "Categoria" categoria
LEFT JOIN "Produto" produto ON produto."categoriaId" = categoria.id
GROUP BY categoria.id
UNION ALL
SELECT 'tecnica', tecnica.nome, count(produto.id)
FROM "Tecnica" tecnica
LEFT JOIN "Produto" produto ON produto."tecnicaId" = tecnica.id
GROUP BY tecnica.id
UNION ALL
SELECT 'regiao', regiao.nome, count(produto.id)
FROM "Regiao" regiao
LEFT JOIN "PerfilArtesao" perfil ON perfil."regiaoId" = regiao.id
LEFT JOIN "Produto" produto ON produto."artesaoId" = perfil."usuarioId"
GROUP BY regiao.id
ORDER BY dimensao, nome;

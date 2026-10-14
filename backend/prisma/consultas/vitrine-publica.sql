SELECT p."id", p."nome", p."descricao", p."preco",
       p."quantidadeEstoque", p."categoriaId", p."tecnicaId",
       p."artesaoId", p."criadoEm"
FROM "Produto" p
WHERE p."ativo" AND NOT p."desativadoPorAdmin"
  AND p."quantidadeEstoque" > 0
ORDER BY p."criadoEm" DESC
LIMIT 24;

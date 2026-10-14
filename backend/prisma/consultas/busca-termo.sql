SELECT p."id", p."nome", p."descricao", p."preco",
       p."quantidadeEstoque", p."categoriaId", p."tecnicaId",
       p."artesaoId", p."criadoEm"
FROM "Produto" p
WHERE p."ativo" AND NOT p."desativadoPorAdmin"
  AND p."quantidadeEstoque" > 0
  AND (p."nome" ILIKE $1::text OR p."descricao" ILIKE $1::text)
ORDER BY p."criadoEm" DESC
LIMIT 24;

SELECT p."id", p."nome", p."descricao", p."preco",
       p."quantidadeEstoque", p."categoriaId", p."tecnicaId",
       p."artesaoId", p."criadoEm"
FROM "Produto" p
JOIN "PerfilArtesao" pa ON pa."usuarioId" = p."artesaoId"
WHERE p."ativo" AND NOT p."desativadoPorAdmin"
  AND p."quantidadeEstoque" > 0
  AND pa."regiaoId" = $1::text
ORDER BY p."criadoEm" DESC
LIMIT 24;

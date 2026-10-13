SELECT p."id", p."nome", p."tecnicaId", t."nome" AS "tecnica",
       pa."tecnicaPrincipalId", tp."nome" AS "tecnicaPrincipal",
       pa."regiaoId", r."nome" AS "regiao"
FROM "Produto" p
LEFT JOIN "Tecnica" t ON t."id" = p."tecnicaId"
LEFT JOIN "PerfilArtesao" pa ON pa."usuarioId" = p."artesaoId"
LEFT JOIN "Tecnica" tp ON tp."id" = pa."tecnicaPrincipalId"
LEFT JOIN "Regiao" r ON r."id" = pa."regiaoId"
ORDER BY p."id";

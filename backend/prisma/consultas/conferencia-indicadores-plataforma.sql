SELECT 'usuarios' AS fonte, "papel"::text AS grupo, "ativo",
       COUNT(*)::text AS quantidade, NULL::text AS receita
FROM "Usuario"
GROUP BY "papel", "ativo"
UNION ALL
SELECT 'catalogo', NULL, NULL,
       COUNT(*) FILTER (
         WHERE p."ativo" = true AND p."desativadoPorAdmin" = false
           AND p."quantidadeEstoque" > 0
           AND u."papel" = 'artesao' AND u."ativo" = true
       )::text, NULL
FROM "Produto" p
LEFT JOIN "Usuario" u ON u."id" = p."artesaoId"
UNION ALL
SELECT 'pedidos', "status"::text, NULL,
       COUNT(*)::text, COALESCE(SUM("total"), 0)::text
FROM "Pedido"
GROUP BY "status";

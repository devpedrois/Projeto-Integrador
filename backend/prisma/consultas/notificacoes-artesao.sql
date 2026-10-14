SELECT "id", "pedidoId", "tipo", "lida", "criadoEm"
FROM "Notificacao"
WHERE "usuarioId" = $1::uuid AND "lida" = $2::boolean
ORDER BY "criadoEm" DESC
LIMIT 24;

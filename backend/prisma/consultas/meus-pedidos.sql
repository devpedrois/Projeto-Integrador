SELECT "id", "numero", "status", "total", "criadoEm"
FROM "Pedido"
WHERE "compradorId" = $1::uuid
ORDER BY "criadoEm" DESC;

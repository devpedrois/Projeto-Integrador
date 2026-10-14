SELECT "id", "pedidoId"
FROM "IntencaoNotificacao"
WHERE "status" IN ('pendente'::"StatusIntencao", 'falha'::"StatusIntencao");

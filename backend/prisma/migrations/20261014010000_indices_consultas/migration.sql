BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

CREATE INDEX "Produto_vitrine_criadoEm_idx"
ON "Produto" ("criadoEm" DESC)
WHERE "ativo" AND NOT "desativadoPorAdmin" AND "quantidadeEstoque" > 0;

CREATE INDEX "Produto_nome_trgm_idx"
ON "Produto" USING GIN ("nome" public.gin_trgm_ops);
CREATE INDEX "Produto_descricao_trgm_idx"
ON "Produto" USING GIN ("descricao" public.gin_trgm_ops);

CREATE INDEX "Produto_tecnicaId_idx" ON "Produto" ("tecnicaId");
CREATE INDEX "PerfilArtesao_regiaoId_idx" ON "PerfilArtesao" ("regiaoId");

CREATE INDEX "Pedido_compradorId_criadoEm_idx"
ON "Pedido" ("compradorId", "criadoEm" DESC);
DROP INDEX "Pedido_compradorId_idx";

CREATE INDEX "IntencaoNotificacao_status_idx" ON "IntencaoNotificacao" ("status");
CREATE INDEX "Notificacao_usuarioId_lida_criadoEm_idx"
ON "Notificacao" ("usuarioId", "lida", "criadoEm" DESC);

COMMIT;

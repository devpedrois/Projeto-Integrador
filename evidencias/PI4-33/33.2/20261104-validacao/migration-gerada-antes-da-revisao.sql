-- DropIndex
DROP INDEX "Produto_descricao_trgm_idx";

-- DropIndex
DROP INDEX "Produto_nome_trgm_idx";

-- AlterTable
ALTER TABLE "Pedido" ALTER COLUMN "numero" SET DEFAULT ('ORG-'::text || to_char(CURRENT_TIMESTAMP, 'YYYY'::text) || '-'::text || lpad((nextval('"Pedido_numero_seq"'::regclass))::text, 6, '0'::text));

-- CreateIndex
CREATE INDEX "PerfilArtesao_tecnicaPrincipalId_idx" ON "PerfilArtesao"("tecnicaPrincipalId");

-- CreateIndex
CREATE INDEX "Produto_nome_trgm_idx" ON "Produto" USING GIN ("nome" public.gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Produto_descricao_trgm_idx" ON "Produto" USING GIN ("descricao" public.gin_trgm_ops);

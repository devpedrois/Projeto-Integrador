-- Origem: modelo físico consolidado. Destino: schema de aplicação vazio.
-- Prisma 7.10.0: migrate diff --from-empty --to-schema prisma/schema.prisma --script
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- BD-01: pré-requisitos manuais não representados pelo diff
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
CREATE SEQUENCE "Pedido_numero_seq" AS bigint MINVALUE 1 MAXVALUE 999999 NO CYCLE;
-- Fim dos pré-requisitos manuais

-- BD-01: DDL gerado pelo Prisma
-- CreateEnum
CREATE TYPE "PapelUsuario" AS ENUM ('comprador', 'artesao', 'admin');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('pendente', 'confirmado', 'cancelado');

-- CreateEnum
CREATE TYPE "MetodoPagamento" AS ENUM ('pix_simulado');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('aprovado', 'recusado');

-- CreateEnum
CREATE TYPE "StatusIntencao" AS ENUM ('pendente', 'publicada', 'processada', 'falha');

-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('novo_pedido');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "PapelUsuario" NOT NULL DEFAULT 'comprador',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerfilArtesao" (
    "usuarioId" UUID NOT NULL,
    "historia" TEXT,
    "tecnicaPrincipalId" TEXT,
    "regiaoId" TEXT,
    "foto" TEXT,
    "completo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PerfilArtesao_pkey" PRIMARY KEY ("usuarioId")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tecnica" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Tecnica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Regiao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Regiao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "artesaoId" UUID NOT NULL,
    "categoriaId" UUID NOT NULL,
    "tecnicaId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "quantidadeEstoque" INTEGER NOT NULL,
    "quantidadeVendida" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "desativadoPorAdmin" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProdutoFoto" (
    "id" UUID NOT NULL,
    "produtoId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProdutoFoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Carrinho" (
    "usuarioId" UUID NOT NULL,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Carrinho_pkey" PRIMARY KEY ("usuarioId")
);

-- CreateTable
CREATE TABLE "ItemCarrinho" (
    "id" UUID NOT NULL,
    "carrinhoId" UUID NOT NULL,
    "produtoId" UUID NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "precoUnitario" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "ItemCarrinho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" UUID NOT NULL,
    "compradorRef" TEXT,
    "compradorId" UUID NOT NULL,
    "numero" TEXT DEFAULT ('ORG-'::text || to_char(CURRENT_TIMESTAMP, 'YYYY'::text) || '-'::text || lpad((nextval('"Pedido_numero_seq"'::regclass))::text, 6, '0'::text)),
    "status" "StatusPedido" NOT NULL DEFAULT 'pendente',
    "total" DECIMAL(10,2),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPedido" (
    "id" UUID NOT NULL,
    "pedidoId" UUID NOT NULL,
    "produtoId" UUID NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "precoUnitario" DECIMAL(10,2),
    "subtotal" DECIMAL(10,2),

    CONSTRAINT "ItemPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" UUID NOT NULL,
    "pedidoId" UUID NOT NULL,
    "metodo" "MetodoPagamento" NOT NULL DEFAULT 'pix_simulado',
    "valor" DECIMAL(10,2) NOT NULL,
    "status" "StatusPagamento" NOT NULL,
    "dataPagamento" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avaliacao" (
    "id" UUID NOT NULL,
    "compradorId" UUID NOT NULL,
    "produtoId" UUID NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Avaliacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntencaoNotificacao" (
    "id" UUID NOT NULL,
    "pedidoId" UUID NOT NULL,
    "status" "StatusIntencao" NOT NULL DEFAULT 'pendente',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,
    "processadaEm" TIMESTAMPTZ(3),

    CONSTRAINT "IntencaoNotificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "pedidoId" UUID NOT NULL,
    "tipo" "TipoNotificacao" NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "PerfilArtesao_regiaoId_idx" ON "PerfilArtesao"("regiaoId");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nome_key" ON "Categoria"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Tecnica_nome_key" ON "Tecnica"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Regiao_nome_key" ON "Regiao"("nome");

-- CreateIndex
CREATE INDEX "Produto_artesaoId_idx" ON "Produto"("artesaoId");

-- CreateIndex
CREATE INDEX "Produto_categoriaId_idx" ON "Produto"("categoriaId");

-- CreateIndex
CREATE INDEX "Produto_tecnicaId_idx" ON "Produto"("tecnicaId");

-- CreateIndex
CREATE INDEX "Produto_nome_trgm_idx" ON "Produto" USING GIN ("nome" public.gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Produto_descricao_trgm_idx" ON "Produto" USING GIN ("descricao" public.gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "ProdutoFoto_produtoId_ordem_key" ON "ProdutoFoto"("produtoId", "ordem");

-- CreateIndex
CREATE INDEX "ItemCarrinho_produtoId_idx" ON "ItemCarrinho"("produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemCarrinho_carrinhoId_produtoId_key" ON "ItemCarrinho"("carrinhoId", "produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_numero_key" ON "Pedido"("numero");

-- CreateIndex
CREATE INDEX "Pedido_compradorId_criadoEm_idx" ON "Pedido"("compradorId", "criadoEm" DESC);

-- CreateIndex
CREATE INDEX "ItemPedido_pedidoId_idx" ON "ItemPedido"("pedidoId");

-- CreateIndex
CREATE INDEX "ItemPedido_produtoId_idx" ON "ItemPedido"("produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_pedidoId_key" ON "Pagamento"("pedidoId");

-- CreateIndex
CREATE INDEX "Avaliacao_produtoId_idx" ON "Avaliacao"("produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "Avaliacao_compradorId_produtoId_key" ON "Avaliacao"("compradorId", "produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "IntencaoNotificacao_pedidoId_key" ON "IntencaoNotificacao"("pedidoId");

-- CreateIndex
CREATE INDEX "IntencaoNotificacao_status_idx" ON "IntencaoNotificacao"("status");

-- CreateIndex
CREATE INDEX "Notificacao_pedidoId_idx" ON "Notificacao"("pedidoId");

-- CreateIndex
CREATE INDEX "Notificacao_usuarioId_lida_criadoEm_idx" ON "Notificacao"("usuarioId", "lida", "criadoEm" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Notificacao_usuarioId_pedidoId_tipo_key" ON "Notificacao"("usuarioId", "pedidoId", "tipo");

-- AddForeignKey
ALTER TABLE "PerfilArtesao" ADD CONSTRAINT "PerfilArtesao_tecnicaPrincipalId_fkey" FOREIGN KEY ("tecnicaPrincipalId") REFERENCES "Tecnica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfilArtesao" ADD CONSTRAINT "PerfilArtesao_regiaoId_fkey" FOREIGN KEY ("regiaoId") REFERENCES "Regiao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfilArtesao" ADD CONSTRAINT "PerfilArtesao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_tecnicaId_fkey" FOREIGN KEY ("tecnicaId") REFERENCES "Tecnica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_artesaoId_fkey" FOREIGN KEY ("artesaoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoFoto" ADD CONSTRAINT "ProdutoFoto_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Carrinho" ADD CONSTRAINT "Carrinho_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCarrinho" ADD CONSTRAINT "ItemCarrinho_carrinhoId_fkey" FOREIGN KEY ("carrinhoId") REFERENCES "Carrinho"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCarrinho" ADD CONSTRAINT "ItemCarrinho_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntencaoNotificacao" ADD CONSTRAINT "IntencaoNotificacao_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Fim do DDL gerado pelo Prisma

-- BD-01: complementos manuais das migrations
-- 20260914000000_init_fccpd
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_quantidadeEstoque_check" CHECK ("quantidadeEstoque" >= 0);
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_quantidade_check" CHECK ("quantidade" > 0);

-- 20260915154901_add_dominio_completo
ALTER TABLE "ItemCarrinho" ADD CONSTRAINT "ItemCarrinho_quantidade_check" CHECK ("quantidade" > 0);
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_nota_check" CHECK ("nota" BETWEEN 1 AND 5);

-- 20261013213237_reconciliar_modelo_logico
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_preco_check" CHECK ("preco" > 0);
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_precoUnitario_check" CHECK ("precoUnitario" >= 0);
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_subtotal_check" CHECK ("subtotal" >= 0);
ALTER TABLE "ItemCarrinho" ADD CONSTRAINT "ItemCarrinho_precoUnitario_check" CHECK ("precoUnitario" >= 0);
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_total_check" CHECK ("total" >= 0);
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_valor_check" CHECK ("valor" > 0);
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_senhaHash_check" CHECK (length("senhaHash") > 0);
CREATE UNIQUE INDEX "Usuario_email_lower_key" ON "Usuario" (lower("email"));
COMMENT ON COLUMN "Pedido"."compradorRef" IS
  'Legado do backend minimo de FCCPD. Remover na Sprint 6; compradorId e a FK real.';

-- 20261014010000_indices_consultas
-- Os dois GIN pg_trgm já aparecem na seção gerada.
CREATE INDEX "Produto_vitrine_criadoEm_idx"
ON "Produto" ("criadoEm" DESC)
WHERE "ativo" AND NOT "desativadoPorAdmin" AND "quantidadeEstoque" > 0;

-- 20261014160000_checkout_web09
ALTER SEQUENCE "Pedido_numero_seq" OWNED BY "Pedido"."numero";
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_quantidadeVendida_check" CHECK ("quantidadeVendida" >= 0);
-- Fim dos complementos manuais

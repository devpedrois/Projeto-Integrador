-- CreateEnum
CREATE TYPE "PapelUsuario" AS ENUM ('comprador', 'artesao', 'admin');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('pendente', 'confirmado', 'cancelado');

-- CreateEnum
CREATE TYPE "MetodoPagamento" AS ENUM ('pix_simulado');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('aprovado', 'recusado');

-- AlterTable
-- Campos nascem opcionais para preservar as linhas ja gravadas pelo backend
-- reduzido do FCCPD (ver docs/docs auxiliares/DATA_MODEL.md).
ALTER TABLE "Produto" ADD COLUMN     "artesaoId" UUID,
ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "categoriaId" UUID,
ADD COLUMN     "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "descricao" TEXT,
ADD COLUMN     "preco" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "compradorId" UUID,
ADD COLUMN     "numero" TEXT,
ADD COLUMN     "status" "StatusPedido" NOT NULL DEFAULT 'pendente',
ADD COLUMN     "total" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "ItemPedido" ADD COLUMN     "precoUnitario" DECIMAL(10,2),
ADD COLUMN     "subtotal" DECIMAL(10,2);

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
    "tecnicaPrincipal" TEXT,
    "regiao" TEXT,
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

    CONSTRAINT "ItemCarrinho_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ItemCarrinho_quantidade_check" CHECK ("quantidade" > 0)
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

    CONSTRAINT "Avaliacao_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Avaliacao_nota_check" CHECK ("nota" BETWEEN 1 AND 5)
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nome_key" ON "Categoria"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "ProdutoFoto_produtoId_ordem_key" ON "ProdutoFoto"("produtoId", "ordem");

-- CreateIndex
CREATE INDEX "ItemCarrinho_produtoId_idx" ON "ItemCarrinho"("produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemCarrinho_carrinhoId_produtoId_key" ON "ItemCarrinho"("carrinhoId", "produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_pedidoId_key" ON "Pagamento"("pedidoId");

-- CreateIndex
CREATE INDEX "Avaliacao_produtoId_idx" ON "Avaliacao"("produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "Avaliacao_compradorId_produtoId_key" ON "Avaliacao"("compradorId", "produtoId");

-- CreateIndex
CREATE INDEX "Produto_artesaoId_idx" ON "Produto"("artesaoId");

-- CreateIndex
CREATE INDEX "Produto_categoriaId_idx" ON "Produto"("categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_numero_key" ON "Pedido"("numero");

-- CreateIndex
CREATE INDEX "Pedido_compradorId_idx" ON "Pedido"("compradorId");

-- AddForeignKey
ALTER TABLE "PerfilArtesao" ADD CONSTRAINT "PerfilArtesao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

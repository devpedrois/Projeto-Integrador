CREATE TABLE "Produto" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "quantidadeEstoque" INTEGER NOT NULL,
    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Produto_quantidadeEstoque_check" CHECK ("quantidadeEstoque" >= 0)
);

CREATE TABLE "Pedido" (
    "id" UUID NOT NULL,
    "compradorRef" TEXT NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ItemPedido" (
    "id" UUID NOT NULL,
    "pedidoId" UUID NOT NULL,
    "produtoId" UUID NOT NULL,
    "quantidade" INTEGER NOT NULL,
    CONSTRAINT "ItemPedido_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ItemPedido_quantidade_check" CHECK ("quantidade" > 0)
);

CREATE INDEX "ItemPedido_pedidoId_idx" ON "ItemPedido"("pedidoId");
CREATE INDEX "ItemPedido_produtoId_idx" ON "ItemPedido"("produtoId");

ALTER TABLE "ItemPedido"
ADD CONSTRAINT "ItemPedido_pedidoId_fkey"
FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ItemPedido"
ADD CONSTRAINT "ItemPedido_produtoId_fkey"
FOREIGN KEY ("produtoId") REFERENCES "Produto"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

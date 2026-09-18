-- CreateEnum
CREATE TYPE "StatusIntencao" AS ENUM ('pendente', 'publicada', 'processada', 'falha');

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

-- CreateIndex
CREATE UNIQUE INDEX "IntencaoNotificacao_pedidoId_key" ON "IntencaoNotificacao"("pedidoId");

-- AddForeignKey
ALTER TABLE "IntencaoNotificacao" ADD CONSTRAINT "IntencaoNotificacao_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

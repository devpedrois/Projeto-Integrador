BEGIN;

CREATE TYPE "TipoNotificacao" AS ENUM ('novo_pedido');

CREATE TABLE "Notificacao" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "pedidoId" UUID NOT NULL,
    "tipo" "TipoNotificacao" NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Notificacao_usuarioId_pedidoId_tipo_key"
ON "Notificacao"("usuarioId", "pedidoId", "tipo");

CREATE INDEX "Notificacao_pedidoId_idx" ON "Notificacao"("pedidoId");

ALTER TABLE "Notificacao"
ADD CONSTRAINT "Notificacao_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "Notificacao_pedidoId_fkey"
FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;

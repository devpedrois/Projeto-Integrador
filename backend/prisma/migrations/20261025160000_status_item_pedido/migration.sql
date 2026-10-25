BEGIN;

CREATE TYPE "StatusItemPedido" AS ENUM ('aguardando_envio', 'enviado');

ALTER TABLE "ItemPedido"
  ADD COLUMN "status" "StatusItemPedido" NOT NULL DEFAULT 'aguardando_envio',
  ADD COLUMN "enviadoEm" TIMESTAMPTZ(3);

COMMIT;

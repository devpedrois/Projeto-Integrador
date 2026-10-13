-- Preflight: dados que as novas regras rejeitariam e que nao tem correcao
-- automatica segura. Aborta com mensagem clara em vez de falhar no meio.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Usuario"
    GROUP BY lower(regexp_replace("email", '^\s+|\s+$', '', 'g'))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'reconciliar_modelo_logico: emails duplicados apos normalizar caixa e espacos. Deduplique "Usuario" antes de aplicar.';
  END IF;

  IF EXISTS (SELECT 1 FROM "Usuario" WHERE length("senhaHash") = 0) THEN
    RAISE EXCEPTION 'reconciliar_modelo_logico: "Usuario" com "senhaHash" vazio. Corrija antes de aplicar.';
  END IF;

  IF EXISTS (SELECT 1 FROM "Produto" WHERE "preco" <= 0) THEN
    RAISE EXCEPTION 'reconciliar_modelo_logico: "Produto" com "preco" <= 0. Corrija antes de aplicar.';
  END IF;

  IF EXISTS (SELECT 1 FROM "ItemPedido" WHERE "precoUnitario" < 0 OR "subtotal" < 0) THEN
    RAISE EXCEPTION 'reconciliar_modelo_logico: "ItemPedido" com valor negativo. Corrija antes de aplicar.';
  END IF;

  IF EXISTS (SELECT 1 FROM "ItemCarrinho" WHERE "precoUnitario" < 0) THEN
    RAISE EXCEPTION 'reconciliar_modelo_logico: "ItemCarrinho" com valor negativo. Corrija antes de aplicar.';
  END IF;

  IF EXISTS (SELECT 1 FROM "Pedido" WHERE "total" < 0) THEN
    RAISE EXCEPTION 'reconciliar_modelo_logico: "Pedido" com total negativo. Corrija antes de aplicar.';
  END IF;

  IF EXISTS (SELECT 1 FROM "Pagamento" WHERE "valor" <= 0) THEN
    RAISE EXCEPTION 'reconciliar_modelo_logico: "Pagamento" com valor <= 0. Corrija antes de aplicar.';
  END IF;
END $$;

-- Backfill dos produtos legados do backend minimo de FCCPD, antes do
-- SET NOT NULL. O produto sai da vitrine para nao ser vendido pelo preco
-- sintetico; o artesao revisa e reativa.
UPDATE "Produto"
SET "descricao" = CASE
      WHEN "descricao" IS NULL OR btrim("descricao") = ''
        THEN 'Produto sintetico legado do backend minimo de FCCPD.'
      ELSE "descricao"
    END,
    "preco" = COALESCE("preco", 1.00),
    "ativo" = false
WHERE "descricao" IS NULL OR btrim("descricao") = '' OR "preco" IS NULL;

-- AlterTable
ALTER TABLE "Produto" ALTER COLUMN "descricao" SET NOT NULL,
ALTER COLUMN "preco" SET NOT NULL,
ADD CONSTRAINT "Produto_preco_check" CHECK ("preco" > 0);

-- Checks monetarios
ALTER TABLE "ItemPedido"
ADD CONSTRAINT "ItemPedido_precoUnitario_check" CHECK ("precoUnitario" >= 0),
ADD CONSTRAINT "ItemPedido_subtotal_check" CHECK ("subtotal" >= 0);

ALTER TABLE "ItemCarrinho"
ADD CONSTRAINT "ItemCarrinho_precoUnitario_check" CHECK ("precoUnitario" >= 0);

ALTER TABLE "Pedido"
ADD CONSTRAINT "Pedido_total_check" CHECK ("total" >= 0);

ALTER TABLE "Pagamento"
ADD CONSTRAINT "Pagamento_valor_check" CHECK ("valor" > 0);

-- Usuario: emails antigos seguem a mesma normalizacao do UsuarioService
-- (trim + lowercase), senao o login nao os encontraria.
UPDATE "Usuario"
SET "email" = lower(regexp_replace("email", '^\s+|\s+$', '', 'g'))
WHERE "email" <> lower(regexp_replace("email", '^\s+|\s+$', '', 'g'));

CREATE UNIQUE INDEX "Usuario_email_lower_key" ON "Usuario" (lower("email"));

ALTER TABLE "Usuario"
ADD CONSTRAINT "Usuario_senhaHash_check" CHECK (length("senhaHash") > 0);

-- AlterTable
ALTER TABLE "Produto" ADD COLUMN "desativadoPorAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Pedido" ALTER COLUMN "compradorRef" DROP NOT NULL;

COMMENT ON COLUMN "Pedido"."compradorRef" IS
  'Legado do backend minimo de FCCPD. Remover na Sprint 6; compradorId e a FK real.';

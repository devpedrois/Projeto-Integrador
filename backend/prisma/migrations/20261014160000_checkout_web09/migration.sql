CREATE SEQUENCE "Pedido_numero_seq" AS bigint MINVALUE 1 MAXVALUE 999999 NO CYCLE;

SELECT setval('"Pedido_numero_seq"', GREATEST(COALESCE(MAX(right("numero", 6)::bigint), 0), 1), COALESCE(MAX(right("numero", 6)::bigint), 0) > 0)
FROM "Pedido" WHERE "numero" ~ '^ORG-[0-9]{4}-[0-9]{6}$';

ALTER TABLE "Pedido" ALTER COLUMN "numero" SET DEFAULT (
  'ORG-' || to_char(CURRENT_TIMESTAMP, 'YYYY') || '-' ||
  lpad(nextval('"Pedido_numero_seq"')::text, 6, '0')
);
ALTER SEQUENCE "Pedido_numero_seq" OWNED BY "Pedido"."numero";

ALTER TABLE "Produto" ADD COLUMN "quantidadeVendida" integer NOT NULL DEFAULT 0;
UPDATE "Produto" p SET "quantidadeVendida" = vendas.quantidade
FROM (
  SELECT i."produtoId", SUM(i."quantidade")::integer AS quantidade
  FROM "ItemPedido" i JOIN "Pedido" pedido ON pedido."id" = i."pedidoId"
  WHERE pedido."status" = 'confirmado'
  GROUP BY i."produtoId"
) vendas WHERE vendas."produtoId" = p."id";
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_quantidadeVendida_check" CHECK ("quantidadeVendida" >= 0);

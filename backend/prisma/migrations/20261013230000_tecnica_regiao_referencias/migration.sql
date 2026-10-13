BEGIN;

LOCK TABLE "Produto", "PerfilArtesao" IN ACCESS EXCLUSIVE MODE;

CREATE TABLE "Tecnica" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    CONSTRAINT "Tecnica_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Tecnica_nome_key" ON "Tecnica"("nome");

CREATE TABLE "Regiao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    CONSTRAINT "Regiao_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Regiao_nome_key" ON "Regiao"("nome");

INSERT INTO "Tecnica" ("id", "nome") VALUES
('tecnica-modelagem-argila', 'Modelagem em Argila'),
('tecnica-torno-ceramico', 'Torno Cerâmico'),
('tecnica-renda-irlandesa', 'Renda Irlandesa'),
('tecnica-bordado-mao', 'Bordado à Mão'),
('tecnica-entalhe-madeira', 'Entalhe em Madeira'),
('tecnica-marcenaria-artesanal', 'Marcenaria Artesanal'),
('tecnica-costura-autoral', 'Costura Autoral'),
('tecnica-tecelagem-manual', 'Tecelagem Manual'),
('tecnica-bijuteria-sementes', 'Bijuteria em Sementes Naturais'),
('tecnica-trancado-fibra', 'Trançado em Fibra Natural');

INSERT INTO "Regiao" ("id", "nome") VALUES
('regiao-pilar-recife', 'Comunidade do Pilar - Recife'),
('regiao-alto-moura-caruaru', 'Alto do Moura - Caruaru'),
('regiao-tracunhaem', 'Tracunhaém');

-- Aliases legados autorizados pelo responsavel para esta carga sintetica.
CREATE TEMP TABLE bd03_tecnica_alias (texto TEXT PRIMARY KEY, id TEXT NOT NULL) ON COMMIT DROP;
INSERT INTO bd03_tecnica_alias (texto, id)
SELECT lower(btrim(regexp_replace(translate("nome", 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'), '\s+', ' ', 'g'))), "id"
FROM "Tecnica";
INSERT INTO bd03_tecnica_alias (texto, id) VALUES
('ceramica em barro', 'tecnica-modelagem-argila'),
('marcenaria e renda', 'tecnica-marcenaria-artesanal');

CREATE TEMP TABLE bd03_regiao_alias (texto TEXT PRIMARY KEY, id TEXT NOT NULL) ON COMMIT DROP;
INSERT INTO bd03_regiao_alias (texto, id)
SELECT lower(btrim(regexp_replace(translate("nome", 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'), '\s+', ' ', 'g'))), "id"
FROM "Regiao";
INSERT INTO bd03_regiao_alias (texto, id) VALUES
('recife - comunidade do pilar', 'regiao-pilar-recife'),
('caruaru - alto do moura', 'regiao-alto-moura-caruaru');

-- Produto nao tinha tecnica textual: cada peca sintetica recebe uma escolha explicita.
CREATE TEMP TABLE bd03_produto_tecnica (id UUID PRIMARY KEY, tecnica_id TEXT NOT NULL) ON COMMIT DROP;
INSERT INTO bd03_produto_tecnica (id, tecnica_id) VALUES
('b0000000-0000-4000-8000-000000000001', 'tecnica-torno-ceramico'),
('b0000000-0000-4000-8000-000000000002', 'tecnica-modelagem-argila'),
('b0000000-0000-4000-8000-000000000003', 'tecnica-renda-irlandesa'),
('b0000000-0000-4000-8000-000000000004', 'tecnica-bordado-mao'),
('b0000000-0000-4000-8000-000000000005', 'tecnica-entalhe-madeira'),
('b0000000-0000-4000-8000-000000000006', 'tecnica-costura-autoral'),
('b0000000-0000-4000-8000-000000000007', 'tecnica-bijuteria-sementes'),
('b0000000-0000-4000-8000-000000000008', 'tecnica-tecelagem-manual'),
('b0000000-0000-4000-8000-000000000009', 'tecnica-trancado-fibra');

DO $$
DECLARE
    pendencias TEXT;
BEGIN
    SELECT string_agg(valor, '; ' ORDER BY valor) INTO pendencias
    FROM (
        SELECT DISTINCT format('tecnicaPrincipal=%L', pa."tecnicaPrincipal") AS valor
        FROM "PerfilArtesao" pa
        LEFT JOIN bd03_tecnica_alias a ON a.texto = lower(btrim(regexp_replace(translate(pa."tecnicaPrincipal", 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'), '\s+', ' ', 'g')))
        WHERE pa."tecnicaPrincipal" IS NOT NULL AND a.id IS NULL
        UNION
        SELECT DISTINCT format('regiao=%L', pa."regiao")
        FROM "PerfilArtesao" pa
        LEFT JOIN bd03_regiao_alias a ON a.texto = lower(btrim(regexp_replace(translate(pa."regiao", 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'), '\s+', ' ', 'g')))
        WHERE pa."regiao" IS NOT NULL AND a.id IS NULL
        UNION
        SELECT format('produto sem tecnica: %s (%s)', p."id", p."nome")
        FROM "Produto" p LEFT JOIN bd03_produto_tecnica m ON m.id = p."id"
        WHERE m.id IS NULL
    ) valores;
    IF pendencias IS NOT NULL THEN
        RAISE EXCEPTION 'BD-03: valores sem correspondencia: %', pendencias;
    END IF;
END $$;

ALTER TABLE "Produto" ADD COLUMN "tecnicaId" TEXT;
ALTER TABLE "PerfilArtesao" ADD COLUMN "tecnicaPrincipalId" TEXT, ADD COLUMN "regiaoId" TEXT;

UPDATE "PerfilArtesao" pa SET "tecnicaPrincipalId" = a.id
FROM bd03_tecnica_alias a
WHERE a.texto = lower(btrim(regexp_replace(translate(pa."tecnicaPrincipal", 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'), '\s+', ' ', 'g')));

UPDATE "PerfilArtesao" pa SET "regiaoId" = a.id
FROM bd03_regiao_alias a
WHERE a.texto = lower(btrim(regexp_replace(translate(pa."regiao", 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'), '\s+', ' ', 'g')));

UPDATE "Produto" p SET "tecnicaId" = m.tecnica_id
FROM bd03_produto_tecnica m WHERE m.id = p."id";

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "PerfilArtesao" WHERE ("tecnicaPrincipal" IS NOT NULL AND "tecnicaPrincipalId" IS NULL) OR ("regiao" IS NOT NULL AND "regiaoId" IS NULL))
       OR EXISTS (SELECT 1 FROM "Produto" WHERE "tecnicaId" IS NULL) THEN
        RAISE EXCEPTION 'BD-03: backfill incompleto; textos preservados pelo rollback.';
    END IF;
END $$;

ALTER TABLE "Produto" ALTER COLUMN "tecnicaId" SET NOT NULL,
ADD CONSTRAINT "Produto_tecnicaId_fkey" FOREIGN KEY ("tecnicaId") REFERENCES "Tecnica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PerfilArtesao"
ADD CONSTRAINT "PerfilArtesao_tecnicaPrincipalId_fkey" FOREIGN KEY ("tecnicaPrincipalId") REFERENCES "Tecnica"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "PerfilArtesao_regiaoId_fkey" FOREIGN KEY ("regiaoId") REFERENCES "Regiao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PerfilArtesao" DROP COLUMN "tecnicaPrincipal", DROP COLUMN "regiao";

COMMIT;

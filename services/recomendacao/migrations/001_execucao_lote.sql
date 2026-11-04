CREATE TABLE execucao_lote (
  id uuid PRIMARY KEY,
  "iniciadoEm" timestamptz NOT NULL DEFAULT now(),
  "finalizadoEm" timestamptz,
  concorrencia integer NOT NULL CHECK (concorrencia BETWEEN 1 AND 8),
  "reforcoRegional" boolean NOT NULL,
  "produtosProcessados" integer NOT NULL DEFAULT 0 CHECK ("produtosProcessados" >= 0),
  "duracaoMs" double precision CHECK ("duracaoMs" >= 0),
  "hashResultado" text
);

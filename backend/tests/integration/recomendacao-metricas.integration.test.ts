import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "../../src/database/prisma/client.js";
import { CategoriaRecomendacaoStrategy } from "../../src/integrations/recommendation/categoria-recomendacao.strategy.js";
import { calcularMetricasBaseline } from "../../src/integrations/recommendation/recomendacao-metricas.js";
import { PrismaRecomendacaoRepository } from "../../src/repositories/recomendacao.repository.js";
import { databasePool } from "../helpers/database.js";

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error("DATABASE_URL is required for integration tests");
}

const prisma = createPrismaClient(databaseUrl);
const repository = new PrismaRecomendacaoRepository(prisma);
const strategy = new CategoriaRecomendacaoStrategy(repository);

const LIMITE_ITENS = 8;

afterAll(async () => {
  await prisma.$disconnect();
});

/**
 * Reconstroi o resultado esperado direto do PostgreSQL, sem passar pela
 * Strategy, para validar as metricas contra a carga sintetica real de forma
 * independente da implementacao (docs/docs auxiliares/RECOMMENDATION.md).
 */
async function calcularMetricasEsperadasDaBase(): Promise<{
  cobertura: number;
  acertoCategoria: number;
  produtosElegiveis: number;
  totalRecomendacoes: number;
}> {
  const elegiveis = await databasePool.query<{ id: string; categoriaId: string }>(
    'SELECT "id", "categoriaId" FROM "Produto" WHERE "ativo" = true AND "quantidadeEstoque" > 0',
  );
  const produtos = elegiveis.rows;

  let produtosComRecomendacao = 0;
  let totalRecomendacoes = 0;
  let mesmaCategoria = 0;

  for (const produto of produtos) {
    const mesmaCategoriaCandidatos = produtos.filter(
      (candidato) => candidato.categoriaId === produto.categoriaId && candidato.id !== produto.id,
    );
    const outros = produtos.filter((candidato) => candidato.id !== produto.id);

    const usados = mesmaCategoriaCandidatos.length > 0 ? mesmaCategoriaCandidatos : outros;
    const itens = usados.slice(0, LIMITE_ITENS);

    if (itens.length > 0) {
      produtosComRecomendacao += 1;
    }
    totalRecomendacoes += itens.length;
    mesmaCategoria += itens.filter((item) => item.categoriaId === produto.categoriaId).length;
  }

  const produtosElegiveis = produtos.length;
  const cobertura = produtosElegiveis === 0 ? 0 : (produtosComRecomendacao / produtosElegiveis) * 100;
  const acertoCategoria = totalRecomendacoes === 0 ? 0 : (mesmaCategoria / totalRecomendacoes) * 100;

  return { cobertura, acertoCategoria, produtosElegiveis, totalRecomendacoes };
}

describe("calcularMetricasBaseline - carga sintetica real (PI4-20.5)", () => {
  it("reproduz cobertura e acerto por categoria calculados de forma independente da base", async () => {
    const esperado = await calcularMetricasEsperadasDaBase();

    const metricas = await calcularMetricasBaseline(repository, strategy);

    expect(metricas.cobertura.denominador).toBe(esperado.produtosElegiveis);
    expect(metricas.cobertura.percentual).toBeCloseTo(esperado.cobertura, 10);
    expect(metricas.acertoCategoria.denominador).toBe(esperado.totalRecomendacoes);
    expect(metricas.acertoCategoria.percentual).toBeCloseTo(esperado.acertoCategoria, 10);
  });

  it("produz o mesmo resultado em execucoes repetidas sobre os mesmos dados", async () => {
    const primeira = await calcularMetricasBaseline(repository, strategy);
    const segunda = await calcularMetricasBaseline(repository, strategy);

    expect(segunda).toEqual(primeira);
  });

  it("nunca gera denominador zero quando ha carga sintetica com produtos ativos e com estoque", async () => {
    const metricas = await calcularMetricasBaseline(repository, strategy);

    expect(metricas.cobertura.denominador).toBeGreaterThan(0);
    expect(metricas.acertoCategoria.denominador).toBeGreaterThan(0);
  });
});

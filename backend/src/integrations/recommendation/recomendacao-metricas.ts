import type { RecomendacaoRepository } from "../../repositories/recomendacao.repository.js";
import type { RecomendacaoStrategy } from "./recomendacao.strategy.js";

/**
 * Formulas exatas de docs/docs auxiliares/RECOMMENDATION.md (Metricas v0):
 * cobertura = produtosElegiveisComRecomendacao / produtosElegiveis * 100
 * acertoCategoria = recomendacoesComMesmaCategoria / totalRecomendacoes * 100
 * Denominador zero retorna zero explicitamente, sem excecao nem NaN.
 */
export function calcularCobertura(
  produtosElegiveisComRecomendacao: number,
  produtosElegiveis: number,
): number {
  if (produtosElegiveis === 0) {
    return 0;
  }
  return (produtosElegiveisComRecomendacao / produtosElegiveis) * 100;
}

export function calcularAcertoCategoria(
  recomendacoesComMesmaCategoria: number,
  totalRecomendacoes: number,
): number {
  if (totalRecomendacoes === 0) {
    return 0;
  }
  return (recomendacoesComMesmaCategoria / totalRecomendacoes) * 100;
}

export interface MetricasRecomendacao {
  cobertura: {
    numerador: number;
    denominador: number;
    percentual: number;
  };
  acertoCategoria: {
    numerador: number;
    denominador: number;
    percentual: number;
  };
}

export async function calcularMetricasBaseline(
  repository: RecomendacaoRepository,
  strategy: RecomendacaoStrategy,
): Promise<MetricasRecomendacao> {
  const elegiveis = await repository.listarElegiveis();

  let produtosElegiveisComRecomendacao = 0;
  let totalRecomendacoes = 0;
  let recomendacoesComMesmaCategoria = 0;

  for (const produto of elegiveis) {
    const resultado = await strategy.obter({ produtoId: produto.id });

    if (resultado.itens.length > 0) {
      produtosElegiveisComRecomendacao += 1;
    }

    for (const item of resultado.itens) {
      totalRecomendacoes += 1;
      if (item.categoriaId === produto.categoriaId) {
        recomendacoesComMesmaCategoria += 1;
      }
    }
  }

  const produtosElegiveis = elegiveis.length;

  return {
    cobertura: {
      numerador: produtosElegiveisComRecomendacao,
      denominador: produtosElegiveis,
      percentual: calcularCobertura(produtosElegiveisComRecomendacao, produtosElegiveis),
    },
    acertoCategoria: {
      numerador: recomendacoesComMesmaCategoria,
      denominador: totalRecomendacoes,
      percentual: calcularAcertoCategoria(recomendacoesComMesmaCategoria, totalRecomendacoes),
    },
  };
}

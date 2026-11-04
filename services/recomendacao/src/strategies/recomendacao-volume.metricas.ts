export interface ItemMetrica {
  id: string;
  categoriaId: string;
}

export interface RespostaMetrica {
  estrategia: string;
  itens: ItemMetrica[];
}

function percentual(numerador: number, denominador: number) {
  return {
    numerador,
    denominador,
    percentual: denominador === 0 ? 0 : (numerador * 100) / denominador,
  };
}

export function resumirRecomendacoes(
  respostas: RespostaMetrica[],
  elegiveis: ItemMetrica[],
) {
  const catalogo = new Map(
    elegiveis.map((item) => [item.id, item.categoriaId]),
  );
  const categoriasElegiveis = new Set(catalogo.values());
  const produtosRecomendados = new Set<string>();
  const categoriasRecomendadas = new Set<string>();
  let diversidadeSomada = 0;
  let totalRecomendacoes = 0;
  for (const resposta of respostas) {
    const categorias = new Set<string>();
    totalRecomendacoes += resposta.itens.length;
    for (const item of resposta.itens) {
      if (!catalogo.has(item.id)) continue;
      produtosRecomendados.add(item.id);
      categoriasRecomendadas.add(item.categoriaId);
      categorias.add(item.categoriaId);
    }
    diversidadeSomada += categorias.size;
  }
  return {
    totalRecomendacoes,
    coberturaCatalogo: percentual(produtosRecomendados.size, catalogo.size),
    coberturaContextos: percentual(
      respostas.filter((r) => r.itens.length > 0).length,
      respostas.length,
    ),
    taxaFallback: percentual(
      respostas.filter((r) => r.estrategia === "fallback-geral").length,
      respostas.length,
    ),
    diversidadeCategorias: {
      mediaPorResposta:
        respostas.length === 0 ? 0 : diversidadeSomada / respostas.length,
      distintas: categoriasRecomendadas.size,
      elegiveis: categoriasElegiveis.size,
      percentual: percentual(
        categoriasRecomendadas.size,
        categoriasElegiveis.size,
      ).percentual,
    },
  };
}

export function resumirTempos(tempos: number[]) {
  if (tempos.length === 0) return { amostras: 0, mediaMs: 0, p95Ms: 0 };
  const ordenados = [...tempos].sort((a, b) => a - b);
  return {
    amostras: tempos.length,
    mediaMs: Number(
      (tempos.reduce((soma, tempo) => soma + tempo, 0) / tempos.length).toFixed(
        3,
      ),
    ),
    p95Ms: Number(
      (ordenados[Math.ceil(tempos.length * 0.95) - 1] ?? 0).toFixed(3),
    ),
  };
}

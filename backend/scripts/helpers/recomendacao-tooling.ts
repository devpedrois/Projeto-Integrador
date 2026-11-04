import type { Pool } from "pg";
import type { RecomendacaoStrategy } from "../../src/integrations/recommendation/recomendacao.strategy.js";

export interface ItemMetrica {
  id: string;
  categoriaId: string;
}
export interface RespostaMetrica {
  estrategia: string;
  itens: ItemMetrica[];
}
interface Proporcao {
  numerador: number;
  denominador: number;
  percentual: number;
}
interface Resumo {
  totalRecomendacoes: number;
  coberturaCatalogo: Proporcao;
  coberturaContextos: Proporcao;
  taxaFallback: Proporcao;
  diversidadeCategorias: {
    mediaPorResposta: number;
    distintas: number;
    elegiveis: number;
    percentual: number;
  };
}

const root = new URL("../../../services/recomendacao/src/", import.meta.url);
const volume = (await import(
  new URL("strategies/recomendacao-volume.metricas.ts", root).href
)) as {
  resumirRecomendacoes: (
    respostas: RespostaMetrica[],
    elegiveis: ItemMetrica[],
  ) => Resumo;
  resumirTempos: (tempos: number[]) => {
    amostras: number;
    mediaMs: number;
    p95Ms: number;
  };
};
const metricas = (await import(
  new URL("strategies/recomendacao-metricas.ts", root).href
)) as {
  calcularCobertura: (comRecomendacao: number, elegiveis: number) => number;
  calcularAcertoCategoria: (mesmaCategoria: number, total: number) => number;
  calcularMetricasBaseline: (
    repository: unknown,
    strategy: RecomendacaoStrategy,
  ) => Promise<{ cobertura: Proporcao; acertoCategoria: Proporcao }>;
};
const categoria = (await import(
  new URL("strategies/categoria-recomendacao.strategy.ts", root).href
)) as {
  CategoriaRecomendacaoStrategy: new (
    repository: unknown,
    regional?: boolean,
  ) => RecomendacaoStrategy;
};
const repository = (await import(
  new URL("repositories/recomendacao.repository.ts", root).href
)) as {
  PgRecomendacaoRepository: new (
    pool: Pool,
    schema: string,
  ) => { listarElegiveis: () => Promise<ItemMetrica[]> };
};

export const { resumirRecomendacoes, resumirTempos } = volume;
export const {
  calcularCobertura,
  calcularAcertoCategoria,
  calcularMetricasBaseline,
} = metricas;
export const { CategoriaRecomendacaoStrategy } = categoria;
export const { PgRecomendacaoRepository } = repository;

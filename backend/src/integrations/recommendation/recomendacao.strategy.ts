export interface RecomendacaoContexto {
  produtoId: string;
}

export interface RecomendacaoItem {
  id: string;
}

export interface RecomendacaoResultado {
  estrategia: string;
  itens: RecomendacaoItem[];
}

export interface RecomendacaoStrategy {
  obter(contexto: RecomendacaoContexto): Promise<RecomendacaoResultado>;
}

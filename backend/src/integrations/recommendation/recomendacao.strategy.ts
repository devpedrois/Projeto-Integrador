export interface RecomendacaoContexto {
  produtoId?: string;
  usuarioId?: string;
}

export interface RecomendacaoSelecao {
  estrategia: string;
  produtoIds: string[];
}

export interface RecomendacaoStrategy {
  obter(contexto: RecomendacaoContexto): Promise<RecomendacaoSelecao>;
}

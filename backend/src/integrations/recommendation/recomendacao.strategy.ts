export interface RecomendacaoContexto {
  produtoId?: string;
  usuarioId?: string;
}

export interface RecomendacaoItem {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number | null;
  quantidadeEstoque: number;
  categoriaId: string;
  artesaoId: string;
}

export interface RecomendacaoResultado {
  estrategia: string;
  itens: RecomendacaoItem[];
}

export interface RecomendacaoStrategy {
  obter(contexto: RecomendacaoContexto): Promise<RecomendacaoResultado>;
}

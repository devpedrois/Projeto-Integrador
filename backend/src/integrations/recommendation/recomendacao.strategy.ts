export interface RecomendacaoContexto {
  produtoId?: string;
  usuarioId?: string;
}

export interface RecomendacaoSelecao {
  estrategia: RecomendacaoEstrategia;
  produtoIds: string[];
}

export type RecomendacaoEstrategia =
  | "categoria"
  | "historico-compra"
  | "fallback-geral"
  | "fallback-local"
  | "misto";

export interface RecomendacaoStrategy {
  obter(contexto: RecomendacaoContexto): Promise<RecomendacaoSelecao>;
}

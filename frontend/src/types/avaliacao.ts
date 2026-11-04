export interface Avaliacao {
  id: string;
  produtoId: string;
  compradorId: string;
  nota: number;
  comentario?: string;
  criadoEm: string;
}

export interface NovaAvaliacaoInput {
  produtoId: string;
  nota: number;
  comentario?: string;
}

export type AvaliacaoPublica = Omit<Avaliacao, "compradorId">;

export interface PaginacaoAvaliacoes {
  limit?: number;
  offset?: number;
}

export interface PaginaAvaliacoes {
  itens: AvaliacaoPublica[];
  resumo: { media: number; total: number };
}

export interface ResumoAvaliacoes {
  produtoId: string;
  media: number;
  quantidade: number;
}

export type ElegibilidadeAvaliacao =
  | { podeAvaliar: true; motivo: null }
  | { podeAvaliar: false; motivo: "nao_comprou" | "ja_avaliou" };

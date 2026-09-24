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

export interface ResumoAvaliacoes {
  produtoId: string;
  media: number;
  quantidade: number;
}

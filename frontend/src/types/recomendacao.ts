import type { Produto } from "@/types/produto";

export type RecomendacaoContexto =
  | { produtoId: string; usuarioId?: never }
  | { usuarioId: string; produtoId?: never }
  | { produtoId?: never; usuarioId?: never };

export interface RecomendacaoResultado {
  estrategia: string;
  itens: Produto[];
}

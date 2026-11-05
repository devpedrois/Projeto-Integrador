import type { Produto } from "@/types/produto";

export type RecomendacaoContexto =
  | { produtoId: string; usuarioId?: never }
  | { usuarioId: string; produtoId?: never }
  | { produtoId?: never; usuarioId?: never };

export interface RecomendacaoResultado {
  estrategia: RecomendacaoEstrategia;
  itens: Produto[];
}

export const RECOMENDACAO_ESTRATEGIAS = [
  "categoria",
  "historico-compra",
  "fallback-geral",
  "fallback-local",
  "misto",
] as const;

export type RecomendacaoEstrategia = (typeof RECOMENDACAO_ESTRATEGIAS)[number];

import type { NovaAvaliacaoInput } from "@/types/avaliacao";

export const NOTA_MINIMA = 1;
export const NOTA_MAXIMA = 5;
export const COMENTARIO_LIMITE_CARACTERES = 500;

export type CampoAvaliacao = keyof NovaAvaliacaoInput;

export type ErrosAvaliacao = Partial<Record<CampoAvaliacao, string>>;

export function validarAvaliacao(input: NovaAvaliacaoInput): ErrosAvaliacao {
  const erros: ErrosAvaliacao = {};

  if (typeof input.produtoId !== "string" || input.produtoId.trim().length === 0) {
    erros.produtoId = "Produto invalido.";
  }

  if (
    !Number.isInteger(input.nota) ||
    input.nota < NOTA_MINIMA ||
    input.nota > NOTA_MAXIMA
  ) {
    erros.nota = `A nota deve ser um numero inteiro de ${NOTA_MINIMA} a ${NOTA_MAXIMA}.`;
  }

  if (input.comentario !== undefined) {
    if (typeof input.comentario !== "string") {
      erros.comentario = "Comentario invalido.";
    } else if (input.comentario.trim().length > COMENTARIO_LIMITE_CARACTERES) {
      erros.comentario = `O comentario deve ter ate ${COMENTARIO_LIMITE_CARACTERES} caracteres.`;
    }
  }

  return erros;
}

export function avaliacaoValida(erros: ErrosAvaliacao): boolean {
  return Object.keys(erros).length === 0;
}

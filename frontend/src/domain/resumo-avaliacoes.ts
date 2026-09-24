import type { Avaliacao, ResumoAvaliacoes } from "@/types/avaliacao";

export function calcularResumoAvaliacoes(
  produtoId: string,
  avaliacoes: readonly Pick<Avaliacao, "nota">[]
): ResumoAvaliacoes {
  const quantidade = avaliacoes.length;
  if (quantidade === 0) return { produtoId, media: 0, quantidade: 0 };

  const soma = avaliacoes.reduce((total, avaliacao) => total + avaliacao.nota, 0);
  const media = Math.round((soma / quantidade) * 10) / 10;

  return { produtoId, media, quantidade };
}

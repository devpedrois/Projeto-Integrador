"use client";

import { useRecomendacoes } from "@/hooks/use-recomendacoes";
import type { RecomendacoesService } from "@/services/contracts/recomendacoes.contract";
import type { RecomendacaoContexto } from "@/types/recomendacao";

export interface FaixaRecomendacoesProps {
  service: RecomendacoesService | null;
  contexto: RecomendacaoContexto | null;
}

/**
 * Apenas exibe o resultado ja ordenado pelo service. Nenhuma regra de
 * ranking vive aqui: toda ordenacao vem do FakeRecommendationAdapter
 * (AV1) ou, na AV2, do HttpRecommendationAdapter, sem alterar este
 * componente.
 */
export function FaixaRecomendacoes({ service, contexto }: FaixaRecomendacoesProps) {
  const estado = useRecomendacoes(service, contexto);

  return (
    <section aria-label="Recomendacoes de produtos" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Recomendado para voce</h2>

      {estado.status === "carregando" ? (
        <p role="status" className="text-sm text-neutral-600">
          Carregando recomendacoes...
        </p>
      ) : null}

      {estado.status === "erro" ? (
        <p role="alert" className="text-sm text-red-700">
          {estado.mensagem}
        </p>
      ) : null}

      {estado.status === "vazio" ? (
        <p className="text-sm text-neutral-600">
          Nenhuma recomendacao disponivel no momento.
        </p>
      ) : null}

      {estado.status === "sucesso" ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {estado.resultado.itens.map((produto) => (
            <li
              key={produto.id}
              className="flex flex-col gap-1 rounded border border-gray-200 p-3"
            >
              <span className="text-sm font-medium">{produto.nome}</span>
              <span className="text-sm text-neutral-600">
                R$ {produto.preco.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

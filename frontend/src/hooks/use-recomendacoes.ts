"use client";

import { useEffect, useState } from "react";
import type { RecomendacoesService } from "@/services/contracts/recomendacoes.contract";
import type {
  RecomendacaoContexto,
  RecomendacaoResultado,
} from "@/types/recomendacao";

export type EstadoRecomendacoes =
  | { status: "carregando" }
  | { status: "sucesso"; resultado: RecomendacaoResultado }
  | { status: "vazio" }
  | { status: "erro"; mensagem: string; recarregar(): void };

const MENSAGEM_ERRO_PADRAO =
  "Não foi possível carregar as recomendações agora.";
const LIMITE_ITENS = 8;

/**
 * Consome `RecomendacoesService` sem aplicar nenhuma regra de ranking aqui:
 * toda ordenacao vem pronta do adapter/service. Contexto vazio solicita
 * fallback geral; null suspende a consulta enquanto o contexto carrega.
 */
export function useRecomendacoes(
  service: RecomendacoesService | null,
  contexto: RecomendacaoContexto | null,
): EstadoRecomendacoes {
  const [tentativa, setTentativa] = useState(0);
  const [estado, setEstado] = useState<EstadoRecomendacoes>({
    status: "carregando",
  });

  useEffect(() => {
    if (!service || !contexto) {
      setEstado({ status: "carregando" });
      return;
    }

    let cancelado = false;
    setEstado({ status: "carregando" });

    service
      .obter(contexto)
      .then((resultado) => {
        if (cancelado) return;
        const itens = resultado.itens
          .filter((produto) => produto.id !== contexto.produtoId)
          .slice(0, LIMITE_ITENS);
        setEstado(
          itens.length === 0
            ? { status: "vazio" }
            : { status: "sucesso", resultado: { ...resultado, itens } },
        );
      })
      .catch(() => {
        if (cancelado) return;
        setEstado({
          status: "erro",
          mensagem: MENSAGEM_ERRO_PADRAO,
          recarregar: () => setTentativa((atual) => atual + 1),
        });
      });

    return () => {
      cancelado = true;
    };
  }, [
    service,
    contexto === null,
    contexto?.produtoId,
    contexto?.usuarioId,
    tentativa,
  ]);

  return estado;
}

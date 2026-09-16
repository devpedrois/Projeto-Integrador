"use client";

import { useEffect, useState } from "react";
import type { RecomendacoesService } from "@/services/contracts/recomendacoes.contract";
import type { RecomendacaoContexto, RecomendacaoResultado } from "@/types/recomendacao";

export type EstadoRecomendacoes =
  | { status: "carregando" }
  | { status: "sucesso"; resultado: RecomendacaoResultado }
  | { status: "vazio" }
  | { status: "erro"; mensagem: string };

const MENSAGEM_ERRO_PADRAO = "Nao foi possivel carregar as recomendacoes agora.";

/**
 * Consome `RecomendacoesService` sem aplicar nenhuma regra de ranking aqui:
 * toda ordenacao vem pronta do adapter/service. Nunca chama o service sem
 * um contexto real (produtoId ou usuarioId ja carregado).
 */
export function useRecomendacoes(
  service: RecomendacoesService | null,
  contexto: RecomendacaoContexto | null
): EstadoRecomendacoes {
  const [estado, setEstado] = useState<EstadoRecomendacoes>({ status: "carregando" });

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
        setEstado(
          resultado.itens.length === 0
            ? { status: "vazio" }
            : { status: "sucesso", resultado }
        );
      })
      .catch(() => {
        if (cancelado) return;
        setEstado({ status: "erro", mensagem: MENSAGEM_ERRO_PADRAO });
      });

    return () => {
      cancelado = true;
    };
  }, [service, contexto?.produtoId, contexto?.usuarioId]);

  return estado;
}

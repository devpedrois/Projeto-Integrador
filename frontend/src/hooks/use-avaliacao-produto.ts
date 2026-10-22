"use client";

import { useEffect, useRef, useState } from "react";
import type { AvaliacoesService } from "@/services/contracts/avaliacoes.contract";
import type { NovaAvaliacaoInput } from "@/types/avaliacao";
import { ServiceError } from "@/services/errors";

type EstadoAvaliacao =
  | "carregando"
  | "disponivel"
  | "enviando"
  | "sucesso"
  | "ja-avaliado"
  | "erro-leitura"
  | "erro-envio";

export function useAvaliacaoProduto(
  service: AvaliacoesService,
  produtoId: string,
  compradorId: string,
) {
  const [estado, setEstado] = useState<EstadoAvaliacao>("carregando");
  const [tentativa, setTentativa] = useState(0);
  const montado = useRef(false);
  const enviando = useRef(false);

  useEffect(() => {
    let cancelado = false;
    montado.current = true;
    setEstado("carregando");
    service
      .listByProduto(produtoId)
      .then((avaliacoes) => {
        if (!cancelado)
          setEstado(
            avaliacoes.some(
              (avaliacao) => avaliacao.compradorId === compradorId,
            )
              ? "ja-avaliado"
              : "disponivel",
          );
      })
      .catch(() => {
        if (!cancelado) setEstado("erro-leitura");
      });
    return () => {
      cancelado = true;
      montado.current = false;
    };
  }, [service, produtoId, compradorId, tentativa]);

  async function enviar(input: NovaAvaliacaoInput): Promise<void> {
    if (enviando.current || !["disponivel", "erro-envio"].includes(estado))
      return;
    enviando.current = true;
    setEstado("enviando");
    try {
      await service.criar(input, compradorId);
      if (montado.current) setEstado("sucesso");
    } catch (error: unknown) {
      if (montado.current)
        setEstado(
          error instanceof ServiceError && error.code === "AVALIACAO_DUPLICADA"
            ? "ja-avaliado"
            : "erro-envio",
        );
    } finally {
      enviando.current = false;
    }
  }

  return {
    estado,
    enviar,
    tentarNovamente: () => setTentativa((atual) => atual + 1),
  };
}

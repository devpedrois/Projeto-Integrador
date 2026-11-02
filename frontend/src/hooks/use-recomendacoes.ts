"use client";

import { useMemo } from "react";
import { useConsultaPublica } from "@/hooks/use-consulta-publica";
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
  const suspenso = contexto === null;
  const produtoId = contexto?.produtoId;
  const usuarioId = contexto?.usuarioId;
  const consulta = useMemo(() => {
    if (!service || suspenso) return null;
    const atual: RecomendacaoContexto =
      produtoId !== undefined
        ? { produtoId }
        : usuarioId !== undefined
          ? { usuarioId }
          : {};
    return () => service.obter(atual);
  }, [service, suspenso, produtoId, usuarioId]);
  const { estado, recarregar } = useConsultaPublica(consulta);
  if (estado.status === "erro")
    return { status: "erro", mensagem: MENSAGEM_ERRO_PADRAO, recarregar };
  if (estado.status === "carregando") return estado;
  const itens = estado.dados.itens
    .filter((produto) => produto.id !== produtoId)
    .slice(0, LIMITE_ITENS);
  return itens.length === 0
    ? { status: "vazio" }
    : { status: "sucesso", resultado: { ...estado.dados, itens } };
}

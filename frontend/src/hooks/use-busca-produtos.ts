"use client";

import { useMemo } from "react";
import { useConsultaPublica } from "@/hooks/use-consulta-publica";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { ProdutoQuery } from "@/types/produto-query";
import type { Produto } from "@/types/produto";

export type EstadoBuscaProdutos =
  | { status: "carregando" }
  | { status: "sucesso"; produtos: Produto[] }
  | { status: "vazio" }
  | { status: "erro"; mensagem: string };

const MENSAGEM_ERRO_PADRAO = "Não foi possível buscar produtos agora.";

export function useBuscaProdutos(
  service: ProdutosService | null,
  query: ProdutoQuery,
): EstadoBuscaProdutos {
  const chaveQuery = JSON.stringify(query);
  const consulta = useMemo(
    () =>
      service
        ? () => service.search(JSON.parse(chaveQuery) as ProdutoQuery)
        : null,
    [service, chaveQuery],
  );
  const { estado } = useConsultaPublica(consulta);
  if (estado.status === "erro")
    return { status: "erro", mensagem: MENSAGEM_ERRO_PADRAO };
  if (estado.status === "carregando") return estado;
  return estado.dados.length === 0
    ? { status: "vazio" }
    : { status: "sucesso", produtos: estado.dados };
}

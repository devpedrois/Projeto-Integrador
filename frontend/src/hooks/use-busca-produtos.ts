"use client";

import { useEffect, useState } from "react";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { ProdutoQuery } from "@/types/produto-query";
import type { Produto } from "@/types/produto";

export type EstadoBuscaProdutos =
  | { status: "carregando" }
  | { status: "sucesso"; produtos: Produto[] }
  | { status: "vazio" }
  | { status: "erro"; mensagem: string };

const MENSAGEM_ERRO_PADRAO = "Nao foi possivel buscar produtos agora.";

export function useBuscaProdutos(
  service: ProdutosService | null,
  query: ProdutoQuery
): EstadoBuscaProdutos {
  const [estado, setEstado] = useState<EstadoBuscaProdutos>({ status: "carregando" });
  const chaveQuery = JSON.stringify(query);

  useEffect(() => {
    if (!service) {
      setEstado({ status: "carregando" });
      return;
    }

    let cancelado = false;
    setEstado({ status: "carregando" });

    service
      .search(JSON.parse(chaveQuery) as ProdutoQuery)
      .then((produtos) => {
        if (cancelado) return;
        setEstado(
          produtos.length === 0 ? { status: "vazio" } : { status: "sucesso", produtos }
        );
      })
      .catch(() => {
        if (cancelado) return;
        setEstado({ status: "erro", mensagem: MENSAGEM_ERRO_PADRAO });
      });

    return () => {
      cancelado = true;
    };
  }, [service, chaveQuery]);

  return estado;
}

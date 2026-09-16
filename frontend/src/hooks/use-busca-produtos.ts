"use client";

import { useEffect, useState } from "react";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { Produto } from "@/types/produto";

export type EstadoBuscaProdutos =
  | { status: "carregando" }
  | { status: "sucesso"; produtos: Produto[] }
  | { status: "erro"; mensagem: string };

const MENSAGEM_ERRO_PADRAO = "Nao foi possivel buscar produtos agora.";

export function useBuscaProdutos(
  service: ProdutosService | null,
  termo: string
): EstadoBuscaProdutos {
  const [estado, setEstado] = useState<EstadoBuscaProdutos>({ status: "carregando" });

  useEffect(() => {
    if (!service) {
      setEstado({ status: "carregando" });
      return;
    }

    let cancelado = false;
    setEstado({ status: "carregando" });

    service
      .search(termo)
      .then((produtos) => {
        if (cancelado) return;
        setEstado({ status: "sucesso", produtos });
      })
      .catch(() => {
        if (cancelado) return;
        setEstado({ status: "erro", mensagem: MENSAGEM_ERRO_PADRAO });
      });

    return () => {
      cancelado = true;
    };
  }, [service, termo]);

  return estado;
}

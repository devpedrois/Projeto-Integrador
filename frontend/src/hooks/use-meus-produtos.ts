"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { Produto } from "@/types/produto";

export type EstadoMeusProdutos =
  | { status: "carregando" }
  | { status: "sucesso"; produtos: Produto[] }
  | { status: "vazio" }
  | { status: "erro"; mensagem: string };

export interface UseMeusProdutosResultado {
  estado: EstadoMeusProdutos;
  recarregar: () => void;
}

const MENSAGEM_ERRO_PADRAO =
  "Nao foi possivel carregar seus produtos agora.";

export function useMeusProdutos(
  service: ProdutosService | null,
  artesaoId: string | null
): UseMeusProdutosResultado {
  const [estado, setEstado] = useState<EstadoMeusProdutos>({
    status: "carregando",
  });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!service || !artesaoId) {
      setEstado({ status: "carregando" });
      return;
    }

    let cancelado = false;
    setEstado({ status: "carregando" });

    service
      .listByArtesao(artesaoId)
      .then((produtos) => {
        if (cancelado) return;
        setEstado(
          produtos.length === 0
            ? { status: "vazio" }
            : { status: "sucesso", produtos }
        );
      })
      .catch(() => {
        if (cancelado) return;
        setEstado({ status: "erro", mensagem: MENSAGEM_ERRO_PADRAO });
      });

    return () => {
      cancelado = true;
    };
  }, [service, artesaoId, versao]);

  const recarregar = useCallback(() => {
    setVersao((atual) => atual + 1);
  }, []);

  return { estado, recarregar };
}

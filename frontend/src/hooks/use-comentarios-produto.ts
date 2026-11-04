"use client";

import { useEffect, useState } from "react";
import type { AvaliacoesService } from "@/services/contracts/avaliacoes.contract";
import type { PaginaAvaliacoes } from "@/types/avaliacao";

type EstadoComentarios =
  | { status: "carregando" }
  | { status: "erro" }
  | { status: "sucesso" | "vazio"; dados: PaginaAvaliacoes };

export function useComentariosProduto(
  service: AvaliacoesService,
  produtoId: string,
) {
  const [pagina, setPagina] = useState(1);
  const [versao, setVersao] = useState(0);
  const [estado, setEstado] = useState<EstadoComentarios>({
    status: "carregando",
  });
  useEffect(() => {
    let cancelado = false;
    setEstado({ status: "carregando" });
    service
      .listarPagina(produtoId, { limit: 10, offset: (pagina - 1) * 10 })
      .then((dados) => {
        if (cancelado) return;
        const ultima = Math.max(1, Math.ceil(dados.resumo.total / 10));
        if (pagina > ultima) {
          setPagina(ultima);
          return;
        }
        setEstado({
          status: dados.resumo.total === 0 ? "vazio" : "sucesso",
          dados,
        });
      })
      .catch(() => {
        if (!cancelado) setEstado({ status: "erro" });
      });
    return () => {
      cancelado = true;
    };
  }, [service, produtoId, pagina, versao]);
  return {
    estado,
    pagina,
    navegar: (nova: number) => {
      setEstado({ status: "carregando" });
      setPagina(nova);
    },
    recarregar: () => {
      setEstado({ status: "carregando" });
      setVersao((atual) => atual + 1);
    },
  };
}

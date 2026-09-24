"use client";

import { useCallback, useEffect, useState } from "react";
import type { ModeracaoService } from "@/services/contracts/moderacao.contract";
import type { Produto } from "@/types/produto";
import type { UsuarioPublico } from "@/types/usuario";

export type EstadoModeracao =
  | { status: "carregando" }
  | { status: "sucesso"; artesaos: UsuarioPublico[]; produtos: Produto[] }
  | { status: "erro"; mensagem: string };

export interface UseModeracaoResultado {
  estado: EstadoModeracao;
  recarregar: () => void;
}

const MENSAGEM_ERRO_PADRAO =
  "Nao foi possivel carregar os cadastros para moderacao agora.";

export function useModeracao(
  service: ModeracaoService | null,
  adminId: string | null
): UseModeracaoResultado {
  const [estado, setEstado] = useState<EstadoModeracao>({ status: "carregando" });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!service || !adminId) {
      setEstado({ status: "carregando" });
      return;
    }

    let cancelado = false;
    setEstado((atual) => (atual.status === "sucesso" ? atual : { status: "carregando" }));

    Promise.all([service.listarArtesaos(adminId), service.listarProdutos(adminId)])
      .then(([artesaos, produtos]) => {
        if (cancelado) return;
        setEstado({ status: "sucesso", artesaos, produtos });
      })
      .catch(() => {
        if (cancelado) return;
        setEstado({ status: "erro", mensagem: MENSAGEM_ERRO_PADRAO });
      });

    return () => {
      cancelado = true;
    };
  }, [service, adminId, versao]);

  const recarregar = useCallback(() => {
    setVersao((atual) => atual + 1);
  }, []);

  return { estado, recarregar };
}

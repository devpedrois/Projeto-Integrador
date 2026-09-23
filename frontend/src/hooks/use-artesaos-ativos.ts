"use client";

import { useEffect, useState } from "react";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";

export interface ArtesaoAtivo {
  id: string;
  nome: string;
}

export type EstadoArtesaosAtivos =
  | { status: "carregando" }
  | { status: "sucesso"; artesaos: readonly ArtesaoAtivo[] }
  | { status: "erro"; mensagem: string };

const MENSAGEM_ERRO_PADRAO = "Nao foi possivel carregar os artesaos agora.";

export function useArtesaosAtivos(
  service: UsuariosService | null
): EstadoArtesaosAtivos {
  const [estado, setEstado] = useState<EstadoArtesaosAtivos>({ status: "carregando" });

  useEffect(() => {
    if (!service) {
      setEstado({ status: "carregando" });
      return;
    }

    let cancelado = false;
    setEstado({ status: "carregando" });

    service
      .list()
      .then((usuarios) => {
        if (cancelado) return;
        const artesaos = usuarios
          .filter((usuario) => usuario.papel === "artesao" && usuario.ativo)
          .map((usuario) => ({ id: usuario.id, nome: usuario.nome }))
          .sort((a, b) => a.nome.localeCompare(b.nome));
        setEstado({ status: "sucesso", artesaos });
      })
      .catch(() => {
        if (cancelado) return;
        setEstado({ status: "erro", mensagem: MENSAGEM_ERRO_PADRAO });
      });

    return () => {
      cancelado = true;
    };
  }, [service]);

  return estado;
}

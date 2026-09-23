"use client";

import { useEffect, useState } from "react";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";

export function useNomeArtesao(
  service: UsuariosService | null,
  artesaoId: string
): string | null {
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    if (!service) {
      setNome(null);
      return;
    }

    let cancelado = false;

    service
      .list()
      .then((usuarios) => {
        if (cancelado) return;
        const usuario = usuarios.find((candidato) => candidato.id === artesaoId);
        setNome(usuario?.nome ?? null);
      })
      .catch(() => {
        if (cancelado) return;
        setNome(null);
      });

    return () => {
      cancelado = true;
    };
  }, [service, artesaoId]);

  return nome;
}

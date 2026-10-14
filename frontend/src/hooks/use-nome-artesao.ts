"use client";

import { useEffect, useState } from "react";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";

export function useNomeArtesao(
  service: UsuariosService | null,
  artesaoId: string,
): string | null {
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    if (!service || !artesaoId) {
      setNome(null);
      return;
    }

    let cancelado = false;
    setNome(null);

    const carregar = service.obterNomeArtesao
      ? service.obterNomeArtesao(artesaoId)
      : service
          .list()
          .then(
            (usuarios) =>
              usuarios.find((candidato) => candidato.id === artesaoId)?.nome ??
              null,
          );
    carregar
      .then((nomeCarregado) => {
        if (cancelado) return;
        setNome(nomeCarregado);
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

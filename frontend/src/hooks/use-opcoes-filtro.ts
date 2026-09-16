"use client";

import { useEffect, useState } from "react";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";
import type { Categoria } from "@/types/categoria";
import type { Tecnica } from "@/types/tecnica";
import type { Regiao } from "@/types/regiao";

export type EstadoOpcoesFiltro =
  | { status: "carregando" }
  | {
      status: "sucesso";
      categorias: readonly Categoria[];
      tecnicas: readonly Tecnica[];
      regioes: readonly Regiao[];
    }
  | { status: "erro"; mensagem: string };

const MENSAGEM_ERRO_PADRAO = "Nao foi possivel carregar os filtros agora.";

export function useOpcoesFiltro(
  service: OpcoesFiltroService | null
): EstadoOpcoesFiltro {
  const [estado, setEstado] = useState<EstadoOpcoesFiltro>({ status: "carregando" });

  useEffect(() => {
    if (!service) {
      setEstado({ status: "carregando" });
      return;
    }

    let cancelado = false;
    setEstado({ status: "carregando" });

    Promise.all([service.categorias(), service.tecnicas(), service.regioes()])
      .then(([categorias, tecnicas, regioes]) => {
        if (cancelado) return;
        setEstado({ status: "sucesso", categorias, tecnicas, regioes });
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

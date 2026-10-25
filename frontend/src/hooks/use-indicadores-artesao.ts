"use client";

import { useEffect, useState } from "react";
import type {
  IndicadoresArtesao,
  IndicadoresArtesaoService,
} from "@/services/contracts/indicadores-artesao.contract";

type EstadoIndicadores =
  | { status: "carregando" }
  | { status: "erro" }
  | { status: "sucesso" | "vazio"; dados: IndicadoresArtesao };

export function useIndicadoresArtesao(service: IndicadoresArtesaoService) {
  const [estado, setEstado] = useState<EstadoIndicadores>({
    status: "carregando",
  });
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    let cancelado = false;
    setEstado({ status: "carregando" });
    service
      .obter()
      .then((dados) => {
        if (!cancelado)
          setEstado({
            status: dados.numeroPedidos === 0 ? "vazio" : "sucesso",
            dados,
          });
      })
      .catch(() => {
        if (!cancelado) setEstado({ status: "erro" });
      });
    return () => {
      cancelado = true;
    };
  }, [service, versao]);
  return {
    estado,
    recarregar: () => {
      setEstado({ status: "carregando" });
      setVersao((atual) => atual + 1);
    },
  };
}

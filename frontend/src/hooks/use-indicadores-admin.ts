"use client";

import { useEffect, useState } from "react";
import type {
  IndicadoresAdmin,
  IndicadoresAdminService,
} from "@/services/contracts/indicadores-admin.contract";

type EstadoIndicadores =
  | { status: "carregando" }
  | { status: "erro" }
  | { status: "sucesso" | "vazio"; dados: IndicadoresAdmin };

export function useIndicadoresAdmin(service: IndicadoresAdminService) {
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
        if (!cancelado) {
          const vazio =
            dados.artesaosAtivos === 0 &&
            dados.produtosAtivos === 0 &&
            dados.pedidosConfirmados === 0 &&
            dados.receitaTotal === "0.00";
          setEstado({ status: vazio ? "vazio" : "sucesso", dados });
        }
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

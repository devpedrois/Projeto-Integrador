"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PerfilArtesaoService } from "@/services/contracts/perfil-artesao.contract";
import {
  verificarPerfilCompleto,
  type CampoPerfilArtesaoPendente,
} from "@/domain/perfil-artesao-completo";

export interface PendenciaPerfilArtesaoProps {
  service: PerfilArtesaoService;
  artesaoId: string;
}

type Estado =
  | { status: "carregando" }
  | { status: "completo" }
  | { status: "incompleto"; camposPendentes: CampoPerfilArtesaoPendente[] }
  | { status: "erro" };

const ROTULOS_CAMPO: Record<CampoPerfilArtesaoPendente, string> = {
  historia: "historia",
  tecnicaId: "tecnica principal",
  regiaoId: "regiao",
};

export function PendenciaPerfilArtesao({
  service,
  artesaoId,
}: PendenciaPerfilArtesaoProps) {
  const [estado, setEstado] = useState<Estado>({ status: "carregando" });

  useEffect(() => {
    let cancelado = false;
    setEstado({ status: "carregando" });

    service
      .obter(artesaoId)
      .then((perfil) => {
        if (cancelado) return;
        const status = verificarPerfilCompleto(perfil);
        setEstado(
          status.completo
            ? { status: "completo" }
            : { status: "incompleto", camposPendentes: status.camposPendentes }
        );
      })
      .catch(() => {
        if (cancelado) return;
        setEstado({ status: "erro" });
      });

    return () => {
      cancelado = true;
    };
  }, [service, artesaoId]);

  if (estado.status === "carregando") {
    return (
      <p role="status" className="text-sm text-neutral-600">
        Verificando seu perfil...
      </p>
    );
  }

  if (estado.status === "erro") {
    return (
      <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        Nao foi possivel verificar seu perfil agora.
      </p>
    );
  }

  if (estado.status === "completo") {
    return null;
  }

  return (
    <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
      <p>
        Seu perfil esta incompleto. Faltam: {estado.camposPendentes
          .map((campo) => ROTULOS_CAMPO[campo])
          .join(", ")}
        .
      </p>
      <Link href="/painel-artesao/perfil" className="font-medium underline">
        Completar perfil
      </Link>
    </div>
  );
}

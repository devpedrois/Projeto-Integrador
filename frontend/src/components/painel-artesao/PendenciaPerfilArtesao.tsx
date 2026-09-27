"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alerta } from "@/components/feedback/Alerta";
import { Icone } from "@/components/vitrine/Icone";
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
  historia: "história",
  tecnicaId: "técnica principal",
  regiaoId: "região",
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
      <p role="status" className="m-0 text-body-sm text-fg-muted">
        Verificando seu perfil...
      </p>
    );
  }

  if (estado.status === "erro") {
    return <Alerta tom="erro">Não foi possível verificar seu perfil agora.</Alerta>;
  }

  if (estado.status === "completo") {
    return null;
  }

  return (
    <Alerta tom="aviso" titulo="Complete seu perfil">
      <div className="flex flex-col items-start gap-1.5">
        <span>
          Antes de cadastrar produtos, preencha as informações de Meu perfil. Faltam:{" "}
          {estado.camposPendentes.map((campo) => ROTULOS_CAMPO[campo]).join(", ")}.
        </span>
        <Link
          href="/painel-artesao/perfil"
          className="inline-flex items-center gap-1.5 font-semibold text-fg-link underline-offset-2 hover:text-fg-link-hover hover:underline"
        >
          Ir para Meu perfil
          <Icone nome="avancar" tamanho={16} className="flex-none" />
        </Link>
      </div>
    </Alerta>
  );
}

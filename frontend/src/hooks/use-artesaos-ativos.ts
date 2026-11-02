"use client";

import { useMemo } from "react";
import { useConsultaPublica } from "@/hooks/use-consulta-publica";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";

export interface ArtesaoAtivo {
  id: string;
  nome: string;
}

export type EstadoArtesaosAtivos =
  | { status: "carregando" }
  | { status: "sucesso"; artesaos: readonly ArtesaoAtivo[] }
  | { status: "erro"; mensagem: string };

const MENSAGEM_ERRO_PADRAO = "Não foi possível carregar os artesãos agora.";

export function useArtesaosAtivos(
  service: UsuariosService | null,
): EstadoArtesaosAtivos {
  const consulta = useMemo(
    () => (service ? () => service.list() : null),
    [service],
  );
  const { estado } = useConsultaPublica(consulta);
  if (estado.status === "erro")
    return { status: "erro", mensagem: MENSAGEM_ERRO_PADRAO };
  if (estado.status === "carregando") return estado;
  return {
    status: "sucesso",
    artesaos: estado.dados
      .filter((usuario) => usuario.papel === "artesao" && usuario.ativo)
      .map((usuario) => ({ id: usuario.id, nome: usuario.nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome)),
  };
}

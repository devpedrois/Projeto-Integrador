import type { PerfilArtesao } from "@/types/perfil-artesao";

export type CampoPerfilArtesaoPendente = "historia" | "tecnicaId" | "regiaoId";

export interface StatusPerfilArtesao {
  completo: boolean;
  camposPendentes: CampoPerfilArtesaoPendente[];
}

function campoPreenchido(valor: string | undefined): boolean {
  return typeof valor === "string" && valor.trim().length > 0;
}

export function verificarPerfilCompleto(
  perfil: PerfilArtesao | null
): StatusPerfilArtesao {
  const camposPendentes: CampoPerfilArtesaoPendente[] = [];

  if (!campoPreenchido(perfil?.historia)) camposPendentes.push("historia");
  if (!campoPreenchido(perfil?.tecnicaId)) camposPendentes.push("tecnicaId");
  if (!campoPreenchido(perfil?.regiaoId)) camposPendentes.push("regiaoId");

  return { completo: camposPendentes.length === 0, camposPendentes };
}

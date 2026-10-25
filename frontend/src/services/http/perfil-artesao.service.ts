import type { PerfilArtesaoService } from "@/services/contracts/perfil-artesao.contract";
import type { PerfilArtesao, PerfilArtesaoInput } from "@/types/perfil-artesao";
import { ServiceError } from "@/services/errors";
import { fotoUrlAceita } from "@/utils/foto-url-segura";
import { ApiClient } from "./api-client";
import { validarFotoPerfil } from "@/validators/foto-perfil.validator";

function lerPerfil(value: unknown, artesaoId: string): PerfilArtesao {
  const invalida = () =>
    new ServiceError("RESPOSTA_INVALIDA", "Resposta de perfil inválida.");
  if (typeof value !== "object" || value === null) throw invalida();
  const {
    artesaoId: id,
    nome,
    historia,
    tecnicaId,
    regiaoId,
    fotoUrl,
    completo,
  } = value as Record<string, unknown>;
  if (
    typeof id !== "string" ||
    id.toLowerCase() !== artesaoId.toLowerCase() ||
    typeof nome !== "string" ||
    !nome.trim() ||
    typeof historia !== "string" ||
    historia.length > 1000 ||
    typeof tecnicaId !== "string" ||
    typeof regiaoId !== "string" ||
    typeof completo !== "boolean" ||
    (fotoUrl !== undefined &&
      (typeof fotoUrl !== "string" || !fotoUrlAceita(fotoUrl)))
  )
    throw invalida();
  return {
    artesaoId: id,
    nome,
    historia,
    tecnicaId,
    regiaoId,
    completo,
    ...(typeof fotoUrl === "string" ? { fotoUrl } : {}),
  };
}

export class HttpPerfilArtesaoService implements PerfilArtesaoService {
  constructor(private readonly client = new ApiClient()) {}

  async enviarFoto(arquivo: File, artesaoId: string): Promise<PerfilArtesao> {
    this.rota(artesaoId);
    await validarFotoPerfil(arquivo);
    const body = new FormData();
    body.append("foto", arquivo);
    return lerPerfil(
      await this.client.request<unknown>("/artesao/perfil/foto", {
        method: "POST",
        body,
      }),
      artesaoId,
    );
  }

  async obter(artesaoId: string): Promise<PerfilArtesao | null> {
    try {
      return lerPerfil(
        await this.client.request<unknown>(this.rota(artesaoId)),
        artesaoId,
      );
    } catch (error: unknown) {
      if (
        error instanceof ServiceError &&
        ["NAO_ENCONTRADO", "ARTESAO_NAO_ENCONTRADO"].includes(error.code)
      )
        return null;
      throw error;
    }
  }
  async salvar(
    input: PerfilArtesaoInput,
    artesaoId: string,
  ): Promise<PerfilArtesao> {
    return lerPerfil(
      await this.client.request<unknown>(this.rota(artesaoId), {
        method: "PATCH",
        body: {
          historia: input.historia.trim(),
          tecnicaId: input.tecnicaId,
          regiaoId: input.regiaoId,
          ...(input.fotoUrl !== undefined
            ? { fotoUrl: input.fotoUrl.trim() }
            : {}),
        },
      }),
      artesaoId,
    );
  }
  private rota(artesaoId: string): string {
    if (!artesaoId.trim())
      throw new ServiceError("ENTRADA_INVALIDA", "Artesão inválido.");
    return `/usuarios/${encodeURIComponent(artesaoId)}/perfil-artesao`;
  }
}

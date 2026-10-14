import type { ModeracaoService } from "@/services/contracts/moderacao.contract";
import type { UsuarioPublico } from "@/types/usuario";
import { ServiceError } from "@/services/errors";
import { ApiClient } from "./api-client";
import {
  lerListaProdutos,
  lerProduto,
  objeto,
  respostaInvalida,
} from "./catalogo-response";

export function lerArtesao(value: unknown): UsuarioPublico {
  if (
    !objeto(value) ||
    typeof value.id !== "string" ||
    !value.id.trim() ||
    typeof value.nome !== "string" ||
    typeof value.email !== "string" ||
    value.papel !== "artesao" ||
    typeof value.ativo !== "boolean"
  )
    return respostaInvalida();
  return {
    id: value.id,
    nome: value.nome,
    email: value.email,
    papel: "artesao",
    ativo: value.ativo,
  };
}
function identidade(id: string) {
  if (typeof id !== "string" || !id.trim())
    throw new ServiceError("ENTRADA_INVALIDA", "Identificador invalido.");
  return encodeURIComponent(id);
}
export class HttpModeracaoService implements ModeracaoService {
  constructor(private readonly client = new ApiClient()) {}
  async listarArtesaos(adminId: string) {
    identidade(adminId);
    const value = await this.client.request<unknown>("/admin/artesaos");
    if (!Array.isArray(value)) return respostaInvalida();
    return value.map(lerArtesao);
  }
  async listarProdutos(adminId: string) {
    identidade(adminId);
    return lerListaProdutos(
      await this.client.request<unknown>("/admin/produtos"),
    );
  }
  ativarArtesao(id: string, adminId: string) {
    return this.artesao(id, adminId, true);
  }
  desativarArtesao(id: string, adminId: string) {
    return this.artesao(id, adminId, false);
  }
  ativarProduto(id: string, adminId: string) {
    return this.produto(id, adminId, true);
  }
  desativarProduto(id: string, adminId: string) {
    return this.produto(id, adminId, false);
  }
  private async artesao(id: string, adminId: string, ativo: boolean) {
    identidade(adminId);
    return lerArtesao(
      await this.client.request<unknown>(
        `/admin/artesaos/${identidade(id)}/moderar`,
        { method: "PATCH", body: { ativo } },
      ),
    );
  }
  private async produto(id: string, adminId: string, ativo: boolean) {
    identidade(adminId);
    return lerProduto(
      await this.client.request<unknown>(
        `/admin/produtos/${identidade(id)}/moderar`,
        { method: "PATCH", body: { ativo } },
      ),
    );
  }
}

import type { AvaliacoesService } from "@/services/contracts/avaliacoes.contract";
import type { Avaliacao, ResumoAvaliacoes } from "@/types/avaliacao";
import { ServiceError } from "@/services/errors";
import { ApiClient } from "./api-client";
import { lerAvaliacoes, type AvaliacoesResponse } from "./catalogo-response";

export class HttpAvaliacoesService implements AvaliacoesService {
  constructor(private readonly client = new ApiClient()) {}

  private async obter(produtoId: string): Promise<AvaliacoesResponse> {
    const params = new URLSearchParams({ produtoId });
    try {
      return lerAvaliacoes(
        await this.client.request<unknown>(`/avaliacoes?${params}`),
        produtoId,
      );
    } catch (error: unknown) {
      if (
        error instanceof ServiceError &&
        ["NAO_ENCONTRADO", "PRODUTO_NAO_ENCONTRADO"].includes(error.code)
      ) {
        return { itens: [], resumo: { media: 0, total: 0 } };
      }
      throw error;
    }
  }

  async listByProduto(produtoId: string): Promise<Avaliacao[]> {
    return (await this.obter(produtoId)).itens;
  }

  async resumo(produtoId: string): Promise<ResumoAvaliacoes> {
    const { resumo } = await this.obter(produtoId);
    return { produtoId, media: resumo.media, quantidade: resumo.total };
  }

  create: AvaliacoesService["create"] = async () => {
    throw new ServiceError(
      "HTTP_NAO_IMPLEMENTADO",
      "Este recurso ainda está indisponível.",
    );
  };
}

import type { AvaliacoesService } from "@/services/contracts/avaliacoes.contract";
import type { Avaliacao, ResumoAvaliacoes } from "@/types/avaliacao";
import { ServiceError } from "@/services/errors";
import { ApiClient } from "./api-client";
import {
  lerAvaliacao,
  lerAvaliacoes,
  type AvaliacoesResponse,
  objeto,
  respostaInvalida,
} from "./catalogo-response";
import {
  avaliacaoValida,
  validarAvaliacaoHttp,
  produtoIdAvaliacaoValido,
} from "@/validators/avaliacao.validator";

export class HttpAvaliacoesService implements AvaliacoesService {
  constructor(private readonly client = new ApiClient()) {}

  elegibilidade: AvaliacoesService["elegibilidade"] = async (produtoId) => {
    if (!produtoIdAvaliacaoValido(produtoId))
      throw new ServiceError("ENTRADA_INVALIDA", "Produto inválido.");
    const params = new URLSearchParams({ produtoId: produtoId.toLowerCase() });
    const resposta = await this.client.request<unknown>(
      `/avaliacoes/elegibilidade?${params}`,
    );
    if (!objeto(resposta)) return respostaInvalida();
    if (resposta.podeAvaliar === true && resposta.motivo === null)
      return { podeAvaliar: true, motivo: null };
    if (
      resposta.podeAvaliar === false &&
      (resposta.motivo === "nao_comprou" || resposta.motivo === "ja_avaliou")
    )
      return { podeAvaliar: false, motivo: resposta.motivo };
    return respostaInvalida();
  };

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

  criar: AvaliacoesService["criar"] = async (input) => {
    const erros = validarAvaliacaoHttp(input);
    if (!avaliacaoValida(erros))
      throw new ServiceError(
        "AVALIACAO_INVALIDA",
        "Dados da avaliação inválidos.",
        { erros },
      );
    const produtoId = input.produtoId.toLowerCase();
    const comentario = input.comentario?.trim();
    return lerAvaliacao(
      await this.client.request<unknown>("/avaliacoes", {
        method: "POST",
        body: {
          produtoId,
          nota: input.nota,
          ...(comentario ? { comentario } : {}),
        },
      }),
      produtoId,
    );
  };

  create: AvaliacoesService["create"] = (input, compradorId) => {
    return this.criar(input, compradorId);
  };
}

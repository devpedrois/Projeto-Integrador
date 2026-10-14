import { produtoVisivelPublicamente } from "@/domain/produto-visibilidade";
import type { RecomendacoesService } from "@/services/contracts/recomendacoes.contract";
import { ServiceError } from "@/services/errors";
import type {
  RecomendacaoContexto,
  RecomendacaoResultado,
} from "@/types/recomendacao";
import { ApiClient } from "./api-client";
import {
  lerListaProdutos,
  objeto,
  respostaInvalida,
} from "./catalogo-response";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMITE_ITENS = 8;

export class HttpRecommendationAdapter implements RecomendacoesService {
  constructor(private readonly client = new ApiClient()) {}

  async obter(contexto: RecomendacaoContexto): Promise<RecomendacaoResultado> {
    if (!objeto(contexto)) return this.contextoInvalido();
    const campos = Object.keys(contexto);
    const campo = campos[0];
    if (
      campos.length > 1 ||
      (campos.length === 1 && campo !== "produtoId" && campo !== "usuarioId")
    )
      return this.contextoInvalido();
    const id =
      campo === "produtoId" || campo === "usuarioId"
        ? contexto[campo]
        : undefined;
    if (campos.length === 1 && (typeof id !== "string" || !UUID.test(id)))
      return this.contextoInvalido();

    const destino =
      campo === "usuarioId"
        ? "/recomendacoes/para-mim"
        : campo === "produtoId"
          ? `/recomendacoes?${new URLSearchParams({ produtoId: id! })}`
          : "/recomendacoes";
    const resposta = await this.client.request<unknown>(destino);
    if (
      !objeto(resposta) ||
      typeof resposta.estrategia !== "string" ||
      !resposta.estrategia.trim()
    )
      return respostaInvalida();

    const vistos = new Set<string>();
    const itens = lerListaProdutos(resposta.itens)
      .filter((produto) => {
        const produtoId = produto.id.toLowerCase();
        if (
          produtoId === contexto.produtoId?.toLowerCase() ||
          vistos.has(produtoId) ||
          !produtoVisivelPublicamente(produto)
        )
          return false;
        vistos.add(produtoId);
        return true;
      })
      .slice(0, LIMITE_ITENS);
    return { estrategia: resposta.estrategia, itens };
  }

  private contextoInvalido(): never {
    throw new ServiceError(
      "ENTRADA_INVALIDA",
      "Contexto de recomendação inválido.",
    );
  }
}

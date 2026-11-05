import type {
  RecomendacaoContexto,
  RecomendacaoSelecao,
  RecomendacaoEstrategia,
  RecomendacaoStrategy,
} from "../integrations/recommendation/recomendacao.strategy.js";
import type { CatalogoRepository } from "../repositories/catalogo.repository.js";
import { mapearProdutoDTO, type ProdutoDTO } from "../utils/produto-dto.js";
import { RecomendacaoIndisponivelError } from "../errors/recomendacao-indisponivel.error.js";
import { RecomendacaoFallbackLocal } from "./recomendacao-fallback-local.js";

export interface RecomendacaoResultado {
  estrategia: RecomendacaoEstrategia;
  itens: ProdutoDTO[];
}

export class RecomendacaoService {
  public constructor(
    private readonly strategy: RecomendacaoStrategy,
    private readonly produtos: Pick<
      CatalogoRepository,
      "carregarVisiveisPorIds" | "listarMaisVendidosVisiveis"
    >,
    private readonly fallback = new RecomendacaoFallbackLocal(produtos),
  ) {}

  public async obter(
    contexto: RecomendacaoContexto,
  ): Promise<RecomendacaoResultado> {
    let selecao: RecomendacaoSelecao;
    try {
      selecao = await this.strategy.obter(contexto);
    } catch (error) {
      if (!(error instanceof RecomendacaoIndisponivelError)) throw error;
      console.warn(
        JSON.stringify({
          evento: "recomendacao-fallback-local",
          motivo: error.motivo,
        }),
      );
      return {
        estrategia: "fallback-local",
        itens: await this.fallback.obter(contexto),
      };
    }
    const produtoIds = [
      ...new Set(selecao.produtoIds.map((id) => id.toLowerCase())),
    ].filter((id) => id.toLowerCase() !== contexto.produtoId?.toLowerCase());
    const produtos = await this.produtos.carregarVisiveisPorIds(produtoIds);
    const porId = new Map(produtos.map((produto) => [produto.id, produto]));
    const itens = produtoIds
      .flatMap((id) => {
        const produto = porId.get(id);
        return produto ? [mapearProdutoDTO(produto)] : [];
      })
      .slice(0, 8);
    if (itens.length === 8) return { estrategia: selecao.estrategia, itens };
    return {
      estrategia: "misto",
      itens: [...itens, ...(await this.fallback.obter(contexto, itens))],
    };
  }
}

import type {
  RecomendacaoContexto,
  RecomendacaoStrategy,
} from "../integrations/recommendation/recomendacao.strategy.js";
import type { CatalogoRepository } from "../repositories/catalogo.repository.js";
import { mapearProdutoDTO, type ProdutoDTO } from "../utils/produto-dto.js";

export interface RecomendacaoResultado {
  estrategia: string;
  itens: ProdutoDTO[];
}

export class RecomendacaoService {
  public constructor(
    private readonly strategy: RecomendacaoStrategy,
    private readonly produtos: Pick<
      CatalogoRepository,
      "carregarVisiveisPorIds"
    >,
  ) {}

  public async obter(
    contexto: RecomendacaoContexto,
  ): Promise<RecomendacaoResultado> {
    const selecao = await this.strategy.obter(contexto);
    const produtoIds = [...new Set(selecao.produtoIds)].filter(
      (id) => id.toLowerCase() !== contexto.produtoId?.toLowerCase(),
    );
    const produtos = await this.produtos.carregarVisiveisPorIds(produtoIds);
    const porId = new Map(produtos.map((produto) => [produto.id, produto]));
    const itens = produtoIds.flatMap((id) => {
      const produto = porId.get(id);
      return produto ? [mapearProdutoDTO(produto)] : [];
    });
    return { estrategia: selecao.estrategia, itens };
  }
}

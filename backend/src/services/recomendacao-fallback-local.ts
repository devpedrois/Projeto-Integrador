import type { RecomendacaoContexto } from "../integrations/recommendation/recomendacao.strategy.js";
import type { CatalogoRepository } from "../repositories/catalogo.repository.js";
import type { ProdutoDTO } from "../utils/produto-dto.js";

export class RecomendacaoFallbackLocal {
  constructor(
    private readonly catalogo: Pick<
      CatalogoRepository,
      "listarMaisVendidosVisiveis"
    >,
  ) {}

  obter(
    contexto: RecomendacaoContexto,
    existentes: ProdutoDTO[] = [],
  ): Promise<ProdutoDTO[]> {
    const limite = 8 - existentes.length;
    if (limite <= 0) return Promise.resolve([]);
    return this.catalogo.listarMaisVendidosVisiveis({
      ...contexto,
      excluirIds: existentes.map(({ id }) => id),
      limite,
    });
  }
}

import type { RecomendacaoRepository } from "../../repositories/recomendacao.repository.js";
import type {
  RecomendacaoContexto,
  RecomendacaoResultado,
  RecomendacaoStrategy,
} from "./recomendacao.strategy.js";

const LIMITE_ITENS = 8;
const ESTRATEGIA_CATEGORIA = "categoria";

/**
 * Baseline oficial de IA (docs/docs auxiliares/RECOMMENDATION.md): candidatos
 * ativos e com estoque da mesma categoria do produto de contexto, ordenados
 * por vendas desc, nota media desc e UUID asc. Sem fallback, endpoint,
 * reforco regional ou metricas nesta subtarefa (PI4-20.1).
 */
export class CategoriaRecomendacaoStrategy implements RecomendacaoStrategy {
  public constructor(private readonly repository: RecomendacaoRepository) {}

  public async obter(contexto: RecomendacaoContexto): Promise<RecomendacaoResultado> {
    const produtoContexto = await this.repository.buscarProduto(contexto.produtoId);
    if (produtoContexto === null) {
      return { estrategia: ESTRATEGIA_CATEGORIA, itens: [] };
    }

    const itens = await this.repository.listarCandidatosPorCategoria({
      categoriaId: produtoContexto.categoriaId,
      excluirProdutoId: produtoContexto.id,
      limite: LIMITE_ITENS,
    });

    return { estrategia: ESTRATEGIA_CATEGORIA, itens };
  }
}

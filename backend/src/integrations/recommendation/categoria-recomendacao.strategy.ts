import type { RecomendacaoRepository } from "../../repositories/recomendacao.repository.js";
import type {
  RecomendacaoContexto,
  RecomendacaoResultado,
  RecomendacaoStrategy,
} from "./recomendacao.strategy.js";

const LIMITE_ITENS = 8;
const ESTRATEGIA_CATEGORIA = "categoria";
const ESTRATEGIA_FALLBACK = "fallback-geral";

/**
 * Baseline oficial de IA (docs/docs auxiliares/RECOMMENDATION.md): candidatos
 * ativos e com estoque da mesma categoria do produto de contexto, ordenados
 * por vendas desc, nota media desc e UUID asc (PI4-20.1). Quando o produto
 * nao existe, nao possui candidatos elegiveis, ou o contexto e `usuarioId`
 * na U1, aplica o fallback geral sobre produtos ativos e com estoque,
 * ordenado pelos mesmos criterios, sem consultar historico pessoal
 * (PI4-20.2). Endpoint HTTP em PI4-20.3, sem reforco regional.
 *
 * `reforcoRegionalAtivo` (PI4-20.4) e uma opcao interna, nao exposta pela
 * API publica: quando ligada, insere uma prioridade lexicografica extra
 * entre categoria e vendas — mesma regiao do artesao do produto de contexto
 * primeiro — sem tocar no fallback geral nem introduzir peso numerico.
 */
export class CategoriaRecomendacaoStrategy implements RecomendacaoStrategy {
  public constructor(
    private readonly repository: RecomendacaoRepository,
    private readonly reforcoRegionalAtivo: boolean = false,
  ) {}

  public async obter(contexto: RecomendacaoContexto): Promise<RecomendacaoResultado> {
    if (contexto.usuarioId !== undefined) {
      return this.fallbackGeral(null);
    }

    if (contexto.produtoId === undefined) {
      return this.fallbackGeral(null);
    }

    const produtoContexto = await this.repository.buscarProduto(contexto.produtoId);
    if (produtoContexto === null) {
      return this.fallbackGeral(null);
    }

    const candidatos = await this.repository.listarCandidatosPorCategoria({
      categoriaId: produtoContexto.categoriaId,
      excluirProdutoId: produtoContexto.id,
      limite: LIMITE_ITENS,
      ...(this.reforcoRegionalAtivo ? { regiaoContexto: produtoContexto.regiao } : {}),
    });

    if (candidatos.length === 0) {
      return this.fallbackGeral(produtoContexto.id);
    }

    return { estrategia: ESTRATEGIA_CATEGORIA, itens: candidatos };
  }

  private async fallbackGeral(excluirProdutoId: string | null): Promise<RecomendacaoResultado> {
    const itens = await this.repository.listarFallbackGeral({
      excluirProdutoId,
      limite: LIMITE_ITENS,
    });
    return { estrategia: ESTRATEGIA_FALLBACK, itens };
  }
}

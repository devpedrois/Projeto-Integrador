import type { RecomendacaoRepository } from "../repositories/recomendacao.repository.js";
import type {
  RecomendacaoContexto,
  RecomendacaoSelecao,
  RecomendacaoStrategy,
} from "./recomendacao.strategy.js";

const LIMITE_ITENS = 8;
const ESTRATEGIA_CATEGORIA = "categoria";
const ESTRATEGIA_FALLBACK = "fallback-geral";

export class CategoriaRecomendacaoStrategy implements RecomendacaoStrategy {
  public constructor(
    private readonly repository: RecomendacaoRepository,
    private readonly reforcoRegionalAtivo: boolean = false,
  ) {}

  public async obter(
    contexto: RecomendacaoContexto,
  ): Promise<RecomendacaoSelecao> {
    if (contexto.usuarioId !== undefined) {
      return this.fallbackGeral(null);
    }

    if (contexto.produtoId === undefined) {
      return this.fallbackGeral(null);
    }

    const produtoContexto = await this.repository.buscarProduto(
      contexto.produtoId,
    );
    if (produtoContexto === null) {
      return this.fallbackGeral(null);
    }

    const candidatos = await this.repository.listarCandidatosPorCategoria({
      categoriaId: produtoContexto.categoriaId,
      excluirProdutoId: produtoContexto.id,
      limite: LIMITE_ITENS,
      ...(this.reforcoRegionalAtivo
        ? { regiaoContexto: produtoContexto.regiao }
        : {}),
    });

    if (candidatos.length === 0) {
      return this.fallbackGeral(produtoContexto.id);
    }

    return { estrategia: ESTRATEGIA_CATEGORIA, produtoIds: candidatos };
  }

  private async fallbackGeral(
    excluirProdutoId: string | null,
  ): Promise<RecomendacaoSelecao> {
    const produtoIds = await this.repository.listarFallbackGeral({
      excluirProdutoId,
      limite: LIMITE_ITENS,
    });
    return { estrategia: ESTRATEGIA_FALLBACK, produtoIds };
  }
}

import type { RecomendacaoRepository } from "../../repositories/recomendacao.repository.js";
import type {
  RecomendacaoContexto,
  RecomendacaoSelecao,
  RecomendacaoStrategy,
} from "./recomendacao.strategy.js";

const LIMITE_ITENS = 8;

export class HistoricoCompraRecomendacaoStrategy implements RecomendacaoStrategy {
  constructor(private readonly repository: RecomendacaoRepository) {}

  async obter(contexto: RecomendacaoContexto): Promise<RecomendacaoSelecao> {
    if (contexto.usuarioId !== undefined) {
      const produtoIds = await this.repository.listarCandidatosPorHistorico({
        compradorId: contexto.usuarioId,
        limite: LIMITE_ITENS,
      });
      if (produtoIds.length > 0) {
        return { estrategia: "historico-compra", produtoIds };
      }
    }
    return {
      estrategia: "fallback-geral",
      produtoIds: await this.repository.listarFallbackGeral({
        excluirProdutoId: null,
        ...(contexto.usuarioId === undefined
          ? {}
          : { excluirCompradorId: contexto.usuarioId }),
        limite: LIMITE_ITENS,
      }),
    };
  }
}

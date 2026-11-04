import type {
  RecomendacaoContexto,
  RecomendacaoStrategy,
} from "../strategies/recomendacao.strategy.js";

export class RecomendacaoService {
  constructor(
    private readonly categoria: RecomendacaoStrategy,
    private readonly historico: RecomendacaoStrategy,
  ) {}
  async obter(contexto: RecomendacaoContexto, limite: number) {
    const strategy =
      contexto.usuarioId === undefined ? this.categoria : this.historico;
    const selecao = await strategy.obter(contexto);
    return { ...selecao, produtoIds: selecao.produtoIds.slice(0, limite) };
  }
}

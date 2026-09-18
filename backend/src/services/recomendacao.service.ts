import type {
  RecomendacaoContexto,
  RecomendacaoResultado,
  RecomendacaoStrategy,
} from "../integrations/recommendation/recomendacao.strategy.js";

export class RecomendacaoService {
  public constructor(private readonly strategy: RecomendacaoStrategy) {}

  public async obter(contexto: RecomendacaoContexto): Promise<RecomendacaoResultado> {
    return this.strategy.obter(contexto);
  }
}

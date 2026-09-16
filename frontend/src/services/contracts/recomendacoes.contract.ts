/**
 * Contrato publico do recurso de recomendacoes.
 *
 * `FakeRecommendationAdapter` (services/fake/recomendacoes) implementa este
 * contrato consultando o repositorio local de produtos do navegador. Ele
 * aplica a mesma especificacao de ranking da baseline oficial (Strategy no
 * backend, PostgreSQL real). Na Avaliacao 2, `HttpRecommendationAdapter`
 * substitui este adapter chamando `GET /recomendacoes`, sem alterar hooks,
 * componentes ou paginas que dependem deste contrato.
 */
import type { RecomendacaoContexto, RecomendacaoResultado } from "@/types/recomendacao";

export interface RecomendacoesService {
  obter(contexto: RecomendacaoContexto): Promise<RecomendacaoResultado>;
}

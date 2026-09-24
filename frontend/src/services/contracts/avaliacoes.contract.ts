/**
 * Contrato publico do recurso de avaliacoes de produto.
 *
 * `FakeAvaliacoesService` (services/fake) implementa este contrato sobre o
 * repositorio local do navegador. Na Avaliacao 2, uma implementacao HTTP
 * consumindo `GET/POST /avaliacoes` substitui a fake sem alterar hooks,
 * componentes ou paginas que dependem deste contrato.
 */
import type { Avaliacao, NovaAvaliacaoInput, ResumoAvaliacoes } from "@/types/avaliacao";

export interface AvaliacoesService {
  listByProduto(produtoId: string): Promise<Avaliacao[]>;
  resumo(produtoId: string): Promise<ResumoAvaliacoes>;
  create(input: NovaAvaliacaoInput, compradorId: string): Promise<Avaliacao>;
}

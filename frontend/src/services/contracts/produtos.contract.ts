/**
 * Contrato publico do recurso de produtos.
 *
 * `FakeProdutosService` (services/fake) implementa este contrato consultando
 * o repositorio local do navegador (fake-api/repositories). Na Avaliacao 2,
 * uma implementacao HTTP equivalente (services/http) substitui a fake sem
 * alterar hooks, stores, componentes ou paginas que dependem deste contrato.
 */
import type { Produto } from "@/types/produto";

export interface ProdutosService {
  list(): Promise<Produto[]>;
}

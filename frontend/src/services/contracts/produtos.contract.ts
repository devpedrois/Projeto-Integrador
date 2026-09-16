/**
 * Contrato publico do recurso de produtos.
 *
 * `FakeProdutosService` (services/fake) implementa este contrato consultando
 * o repositorio local do navegador (fake-api/repositories). Na Avaliacao 2,
 * uma implementacao HTTP equivalente (services/http) substitui a fake sem
 * alterar hooks, stores, componentes ou paginas que dependem deste contrato.
 */
import type { Produto } from "@/types/produto";
import type { NovoProdutoInput } from "@/types/novo-produto";
import type { ProdutoQuery } from "@/types/produto-query";

export interface ProdutosService {
  list(): Promise<Produto[]>;
  create(input: NovoProdutoInput, artesaoId: string): Promise<Produto>;
  listByArtesao(artesaoId: string): Promise<Produto[]>;
  update(id: string, input: NovoProdutoInput, artesaoId: string): Promise<Produto>;
  remove(id: string, artesaoId: string): Promise<void>;
  search(query: ProdutoQuery): Promise<Produto[]>;
}

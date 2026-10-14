/**
 * Contrato publico do recurso de pedidos.
 *
 * `FakePedidosService` (services/fake) implementa este contrato revalidando
 * estoque contra o repositorio local do navegador (fake-api/repositories).
 * Na Avaliacao 2, uma implementacao HTTP equivalente (services/http),
 * consumindo `POST /pedidos`, substitui a fake sem alterar hooks, stores,
 * componentes ou paginas que dependem deste contrato.
 *
 * No HTTP, `compradorId` e ignorado: o backend usa a sessao validada.
 * Os itens do body usam somente produtoId e quantidade.
 * `compradorId` vem sempre da sessao autenticada, nunca de um campo de
 * formulario. Preco e total nunca sao aceitos do chamador: o service
 * recalcula ambos a partir do produto persistido no momento da confirmacao.
 */
import type {
  DetalhePedido,
  ItemPedidoInput,
  Pedido,
  PaginaPedidos,
  PaginacaoPedidos,
} from "@/types/pedido";

export interface PedidosService {
  confirmar(itens: ItemPedidoInput[], compradorId: string): Promise<Pedido>;
  listarMeus(paginacao?: PaginacaoPedidos): Promise<PaginaPedidos>;
  obter(id: string): Promise<DetalhePedido>;
}

/**
 * Contrato publico do recurso de pedidos.
 *
 * `FakePedidosService` (services/fake) implementa este contrato revalidando
 * estoque contra o repositorio local do navegador (fake-api/repositories).
 * Na Avaliacao 2, uma implementacao HTTP equivalente (services/http),
 * consumindo `POST /pedidos`, substitui a fake sem alterar hooks, stores,
 * componentes ou paginas que dependem deste contrato.
 *
 * `compradorId` vem sempre da sessao autenticada, nunca de um campo de
 * formulario. Preco e total nunca sao aceitos do chamador: o service
 * recalcula ambos a partir do produto persistido no momento da confirmacao.
 */
import type { ItemPedidoInput, Pedido } from "@/types/pedido";

export interface PedidosService {
  confirmar(itens: ItemPedidoInput[], compradorId: string): Promise<Pedido>;
}

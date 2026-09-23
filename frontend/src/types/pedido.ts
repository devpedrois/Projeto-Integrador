export interface ItemPedido {
  produtoId: string;
  nome: string;
  precoUnitario: number;
  quantidade: number;
}

export type StatusPedido = "confirmado";

export interface Pedido {
  id: string;
  compradorId: string;
  itens: ItemPedido[];
  total: number;
  numeroConfirmacao: string;
  status: StatusPedido;
  criadoEm: string;
}

export interface ItemPedidoInput {
  produtoId: string;
  quantidade: number;
}

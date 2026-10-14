export interface ItemPedido {
  produtoId: string;
  nome: string;
  precoUnitario: number;
  quantidade: number;
}

export type StatusPedido = "pendente" | "confirmado" | "cancelado";

export interface PagamentoPedido {
  id: string;
  metodo: "pix_simulado";
  status: "aprovado" | "recusado";
  valor: number;
  dataPagamento: string;
}

export interface ResumoPedido {
  id: string;
  numeroConfirmacao: string | null;
  status: StatusPedido;
  total: number | null;
  criadoEm: string;
  pagamento: PagamentoPedido | null;
}

export interface DetalhePedido extends ResumoPedido {
  itens: Array<{
    produtoId: string;
    nome: string;
    quantidade: number;
    precoUnitario: number | null;
    subtotal: number | null;
  }>;
}

export interface PaginacaoPedidos {
  pagina?: number;
  limite?: number;
}

export interface PaginaPedidos {
  itens: ResumoPedido[];
  pagina: number;
  limite: number;
  total: number;
}

export interface Pedido {
  id: string;
  compradorId: string;
  itens: ItemPedido[];
  total: number;
  numeroConfirmacao: string;
  status: StatusPedido;
  criadoEm: string;
  pagamento?: PagamentoPedido | null;
}

export interface ItemPedidoInput {
  produtoId: string;
  quantidade: number;
}

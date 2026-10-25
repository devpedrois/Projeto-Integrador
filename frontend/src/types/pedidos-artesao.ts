import type { DetalhePedido } from "./pedido";

export interface PedidoRecebido {
  id: string;
  numero: string | null;
  criadoEm: string;
  nomeComprador: string;
  itens: DetalhePedido["itens"];
  subtotalArtesao: number;
}

export interface PaginaPedidosRecebidos {
  itens: PedidoRecebido[];
  limit: number;
  offset: number;
  total: number;
}

export interface ItemEnviado {
  id: string;
  status: "enviado";
  enviadoEm: string;
}

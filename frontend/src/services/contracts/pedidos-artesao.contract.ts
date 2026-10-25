import type {
  ItemEnviado,
  PaginaPedidosRecebidos,
} from "@/types/pedidos-artesao";

export interface PedidosArtesaoService {
  listar(offset?: number): Promise<PaginaPedidosRecebidos>;
  enviar(id: string): Promise<ItemEnviado>;
}

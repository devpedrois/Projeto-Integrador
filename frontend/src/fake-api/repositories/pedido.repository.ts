import type { Pedido } from "@/types/pedido";
import { lerListaPersistida } from "@/fake-api/storage/lista-persistida";

const CHAVE_PADRAO = "origem:v1:pedidos";

export interface PedidoRepository {
  list(): Promise<Pedido[]>;
  create(pedido: Pedido): Promise<Pedido>;
}

export class BrowserPedidoRepository implements PedidoRepository {
  constructor(
    private readonly storage: Storage,
    private readonly chave: string = CHAVE_PADRAO
  ) {}

  async list(): Promise<Pedido[]> {
    return lerListaPersistida<Pedido>(this.storage, this.chave) ?? [];
  }

  async create(pedido: Pedido): Promise<Pedido> {
    const pedidos = await this.list();
    pedidos.push(pedido);
    this.storage.setItem(this.chave, JSON.stringify(pedidos));
    return pedido;
  }
}

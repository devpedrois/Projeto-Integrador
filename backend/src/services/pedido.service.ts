import type { PedidoCriado, PedidoRepository } from "../repositories/pedido.repository.js";
import type { CriarPedidoInput } from "../validators/pedido.validator.js";

export class PedidoService {
  public constructor(private readonly repository: PedidoRepository) {}

  public async criar(input: CriarPedidoInput): Promise<PedidoCriado> {
    return this.repository.criar(input);
  }
}

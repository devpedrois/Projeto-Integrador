import type {
  PedidoCriado,
  PedidoRepository,
} from "../repositories/pedido.repository.js";
import type { CriarPedidoInput } from "../validators/pedido.validator.js";
import type { PaginacaoPedidos } from "../validators/pedido.validator.js";
import { AppError } from "../errors/app-error.js";

export class PedidoService {
  public constructor(private readonly repository: PedidoRepository) {}

  public listarMeus(compradorId: string, paginacao: PaginacaoPedidos) {
    return this.repository.listarMeus(compradorId, paginacao);
  }

  public async obter(id: string, compradorId: string) {
    const pedido = await this.repository.obter(id, compradorId);
    if (!pedido)
      throw new AppError(
        404,
        "PEDIDO_NAO_ENCONTRADO",
        "Pedido nao encontrado.",
      );
    return pedido;
  }

  public async criar(
    input: CriarPedidoInput,
    compradorId: string,
  ): Promise<PedidoCriado> {
    return this.repository.criar({ ...input, compradorId });
  }
}

import type {
  PedidoCriado,
  PedidoRepository,
} from "../repositories/pedido.repository.js";
import type { CriarPedidoInput } from "../validators/pedido.validator.js";
import type { PaginacaoPedidos } from "../validators/pedido.validator.js";
import type { PaginacaoPedidosArtesao } from "../validators/pedido.validator.js";
import { AppError } from "../errors/app-error.js";
import type { CachePublico } from "../utils/cache.js";

export class PedidoService {
  public constructor(
    private readonly repository: PedidoRepository,
    private readonly cache?: CachePublico,
  ) {}

  public enviarItem(id: string, artesaoId: string) {
    return this.repository.enviarItem(id, artesaoId);
  }

  public listarMeus(compradorId: string, paginacao: PaginacaoPedidos) {
    return this.repository.listarMeus(compradorId, paginacao);
  }

  public listarRecebidos(
    artesaoId: string,
    paginacao: PaginacaoPedidosArtesao,
  ) {
    return this.repository.listarRecebidos(artesaoId, paginacao);
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
    const resultado = await this.repository.criar({ ...input, compradorId });
    await this.cache?.invalidarCatalogo();
    return resultado;
  }
}

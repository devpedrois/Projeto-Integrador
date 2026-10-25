import type { PedidosArtesaoService } from "@/services/contracts/pedidos-artesao.contract";
import type {
  ItemEnviado,
  PaginaPedidosRecebidos,
} from "@/types/pedidos-artesao";
import { ServiceError } from "@/services/errors";
import { ApiClient } from "./api-client";
import {
  instante,
  lerEstadoEnvio,
  lerItemPedido,
  objeto,
  respostaInvalida,
  texto,
} from "./item-pedido-response";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class HttpPedidosArtesaoService implements PedidosArtesaoService {
  constructor(private readonly client = new ApiClient()) {}

  async listar(offset = 0): Promise<PaginaPedidosRecebidos> {
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10_000)
      throw new ServiceError("ENTRADA_INVALIDA", "Paginação inválida.");
    const registro = objeto(
      await this.client.request<unknown>(
        `/artesao/pedidos?limit=10&offset=${offset}`,
      ),
    );
    if (
      registro.limit !== 10 ||
      registro.offset !== offset ||
      typeof registro.total !== "number" ||
      !Number.isSafeInteger(registro.total) ||
      registro.total < 0 ||
      !Array.isArray(registro.itens) ||
      registro.itens.length > 10 ||
      registro.itens.length > registro.total
    )
      respostaInvalida();
    const itens = registro.itens.map((value: unknown) => {
      const { id, numero, criadoEm, nomeComprador, itens, subtotalArtesao } =
        objeto(value);
      if (
        !texto(id) ||
        !UUID.test(id) ||
        (numero !== null && !texto(numero)) ||
        !instante(criadoEm) ||
        !texto(nomeComprador) ||
        !Array.isArray(itens) ||
        itens.length === 0 ||
        typeof subtotalArtesao !== "number" ||
        !Number.isFinite(subtotalArtesao) ||
        subtotalArtesao < 0
      )
        respostaInvalida();
      const detalhes = itens.map(lerItemPedido);
      if (
        Math.round(subtotalArtesao * 100) !==
          detalhes.reduce(
            (soma, item) => soma + Math.round((item.subtotal ?? 0) * 100),
            0,
          ) ||
        new Set(detalhes.map((item) => item.id)).size !== detalhes.length
      )
        respostaInvalida();
      return {
        id,
        numero,
        criadoEm,
        nomeComprador,
        itens: detalhes,
        subtotalArtesao,
      };
    });
    if (new Set(itens.map((pedido) => pedido.id)).size !== itens.length)
      respostaInvalida();
    return { itens, limit: 10, offset, total: registro.total };
  }

  async enviar(id: string): Promise<ItemEnviado> {
    if (typeof id !== "string" || !UUID.test(id))
      throw new ServiceError(
        "ENTRADA_INVALIDA",
        "Identificador de item inválido.",
      );
    const estado = lerEstadoEnvio(
      await this.client.request<unknown>(
        `/artesao/itens-pedido/${encodeURIComponent(id)}/enviar`,
        { method: "PATCH" },
      ),
    );
    if (
      estado.id.toLowerCase() !== id.toLowerCase() ||
      estado.status !== "enviado" ||
      estado.enviadoEm === null
    )
      respostaInvalida();
    return { id: estado.id, status: "enviado", enviadoEm: estado.enviadoEm };
  }
}

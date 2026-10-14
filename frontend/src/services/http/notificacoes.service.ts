import type {
  Notificacao,
  NotificacoesService,
} from "@/services/contracts/notificacoes.contract";
import { ServiceError } from "@/services/errors";
import { ApiClient } from "./api-client";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function lerNotificacao(value: unknown): Notificacao {
  const invalida = () =>
    new ServiceError("RESPOSTA_INVALIDA", "Resposta de notificações inválida.");
  if (typeof value !== "object" || value === null) throw invalida();
  const { id, pedidoId, tipo, lida, criadoEm } = value as Record<
    string,
    unknown
  >;
  if (
    typeof id !== "string" ||
    !UUID.test(id) ||
    typeof pedidoId !== "string" ||
    !UUID.test(pedidoId) ||
    tipo !== "novo_pedido" ||
    typeof lida !== "boolean" ||
    typeof criadoEm !== "string" ||
    !Number.isFinite(Date.parse(criadoEm))
  )
    throw invalida();
  return { id, pedidoId, tipo, lida, criadoEm };
}

export class HttpNotificacoesService implements NotificacoesService {
  constructor(private readonly client = new ApiClient()) {}

  async listar(): Promise<Notificacao[]> {
    const value = await this.client.request<unknown>("/artesao/notificacoes");
    if (!Array.isArray(value))
      throw new ServiceError(
        "RESPOSTA_INVALIDA",
        "Resposta de notificações inválida.",
      );
    return value.map(lerNotificacao);
  }

  async marcarComoLida(id: string): Promise<void> {
    if (!UUID.test(id))
      throw new ServiceError("ENTRADA_INVALIDA", "Notificação inválida.");
    await this.client.request<void>(
      `/artesao/notificacoes/${encodeURIComponent(id)}/lida`,
      { method: "PATCH" },
    );
  }
}

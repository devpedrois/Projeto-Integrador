import type { PedidosService } from "@/services/contracts/pedidos.contract";
import type { ItemPedido, ItemPedidoInput, Pedido } from "@/types/pedido";
import { ServiceError } from "@/services/errors";
import { ApiClient } from "./api-client";

function invalidar(): never {
  throw new ServiceError("RESPOSTA_INVALIDA", "Resposta de pedido inválida.");
}

function objeto(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    invalidar();
  return value as Record<string, unknown>;
}

function valorMonetario(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= 99_999_999.99
  );
}

function lerPedido(value: unknown): Pedido {
  const data = objeto(value);
  const pedido = objeto(data.pedido);
  const { id, compradorId, numero, status, total, criadoEm } = pedido;
  if (
    typeof id !== "string" ||
    !id ||
    typeof compradorId !== "string" ||
    !compradorId ||
    typeof numero !== "string" ||
    !/^ORG-\d{4}-\d{6}$/.test(numero) ||
    status !== "confirmado" ||
    !valorMonetario(total) ||
    typeof criadoEm !== "string" ||
    !Number.isFinite(Date.parse(criadoEm)) ||
    !Array.isArray(data.itens) ||
    data.itens.length === 0 ||
    data.itens.length > 20
  )
    invalidar();
  const itens: ItemPedido[] = data.itens.map((value: unknown) => {
    const { produtoId, nome, quantidade, precoUnitario, subtotal } =
      objeto(value);
    if (
      typeof produtoId !== "string" ||
      !produtoId ||
      typeof nome !== "string" ||
      !nome.trim() ||
      typeof quantidade !== "number" ||
      !Number.isSafeInteger(quantidade) ||
      quantidade < 1 ||
      !valorMonetario(precoUnitario) ||
      !valorMonetario(subtotal) ||
      Math.round(subtotal * 100) !==
        Math.round(precoUnitario * 100) * quantidade
    )
      invalidar();
    return { produtoId, nome, quantidade, precoUnitario };
  });
  if (
    Math.round(total * 100) !==
    itens.reduce(
      (soma, item) =>
        soma + Math.round(item.precoUnitario * 100) * item.quantidade,
      0,
    )
  )
    invalidar();
  return {
    id,
    compradorId,
    numeroConfirmacao: numero,
    status,
    total,
    criadoEm,
    itens,
  };
}

export class HttpPedidosService implements PedidosService {
  constructor(private readonly client = new ApiClient()) {}

  async confirmar(itens: ItemPedidoInput[]): Promise<Pedido> {
    if (
      !Array.isArray(itens) ||
      itens.length === 0 ||
      itens.length > 20 ||
      itens.some(
        (item) =>
          !item ||
          typeof item.produtoId !== "string" ||
          !item.produtoId.trim() ||
          !Number.isSafeInteger(item.quantidade) ||
          item.quantidade < 1 ||
          item.quantidade > 2_147_483_647,
      )
    )
      throw new ServiceError("ENTRADA_INVALIDA", "Itens do pedido inválidos.");
    return lerPedido(
      await this.client.request<unknown>("/pedidos", {
        method: "POST",
        body: {
          itens: itens.map(({ produtoId, quantidade }) => ({
            produtoId,
            quantidade,
          })),
        },
      }),
    );
  }
}

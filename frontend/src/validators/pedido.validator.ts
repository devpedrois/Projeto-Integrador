import type { ItemPedidoInput } from "@/types/pedido";

export type ErroItensPedido = "QUANTIDADE_INVALIDA" | "ITEM_DUPLICADO";

export function validarItensPedido(itens: readonly ItemPedidoInput[]): ErroItensPedido | null {
  const vistos = new Set<string>();

  for (const item of itens) {
    if (!Number.isSafeInteger(item.quantidade) || item.quantidade <= 0) {
      return "QUANTIDADE_INVALIDA";
    }
    if (vistos.has(item.produtoId)) return "ITEM_DUPLICADO";
    vistos.add(item.produtoId);
  }

  return null;
}

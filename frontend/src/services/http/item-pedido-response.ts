import { ServiceError } from "@/services/errors";
import type { DetalhePedido, StatusItemPedido } from "@/types/pedido";

export function respostaInvalida(): never {
  throw new ServiceError("RESPOSTA_INVALIDA", "Resposta de pedido inválida.");
}

export function objeto(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    respostaInvalida();
  return value as Record<string, unknown>;
}

export function texto(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function instante(value: unknown): value is string {
  return texto(value) && Number.isFinite(Date.parse(value));
}

export function lerEstadoEnvio(value: unknown): {
  id: string;
  status: StatusItemPedido;
  enviadoEm: string | null;
} {
  const { id, status, enviadoEm } = objeto(value);
  if (
    !texto(id) ||
    (status !== "aguardando_envio" && status !== "enviado") ||
    (status === "enviado" ? !instante(enviadoEm) : enviadoEm !== null)
  )
    respostaInvalida();
  return { id, status, enviadoEm: enviadoEm as string | null };
}

function dinheiro(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 99_999_999.99
  );
}

export function lerItemPedido(value: unknown): DetalhePedido["itens"][number] {
  const estado = lerEstadoEnvio(value);
  const { produtoId, nome, quantidade, precoUnitario, subtotal } =
    objeto(value);
  if (
    !texto(produtoId) ||
    !texto(nome) ||
    typeof quantidade !== "number" ||
    !Number.isSafeInteger(quantidade) ||
    quantidade < 1 ||
    (precoUnitario !== null && !dinheiro(precoUnitario)) ||
    (subtotal !== null && !dinheiro(subtotal)) ||
    (precoUnitario !== null &&
      subtotal !== null &&
      Math.round(subtotal * 100) !==
        Math.round(precoUnitario * 100) * quantidade)
  )
    respostaInvalida();
  return { ...estado, produtoId, nome, quantidade, precoUnitario, subtotal };
}

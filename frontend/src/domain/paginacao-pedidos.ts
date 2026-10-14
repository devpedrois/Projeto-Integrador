import { ServiceError } from "@/services/errors";
import type { PaginacaoPedidos } from "@/types/pedido";

export function validarPaginacaoPedidos(
  input: PaginacaoPedidos = {},
): Required<PaginacaoPedidos> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).some((campo) => campo !== "pagina" && campo !== "limite")
  )
    throw new ServiceError("ENTRADA_INVALIDA", "Paginação inválida.");
  const { pagina = 1, limite = 10 } = input;
  if (
    !Number.isSafeInteger(pagina) ||
    pagina < 1 ||
    pagina > 10_000 ||
    !Number.isSafeInteger(limite) ||
    limite < 1 ||
    limite > 100
  )
    throw new ServiceError("ENTRADA_INVALIDA", "Paginação inválida.");
  return { pagina, limite };
}

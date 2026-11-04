import type { PaginacaoAvaliacoes } from "@/types/avaliacao";
import { ServiceError } from "@/services/errors";

export function normalizarPaginacaoAvaliacoes(
  paginacao: PaginacaoAvaliacoes = {},
) {
  const limit = paginacao.limit ?? 10;
  const offset = paginacao.offset ?? 0;
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 50 ||
    !Number.isSafeInteger(offset) ||
    offset < 0
  )
    throw new ServiceError(
      "ENTRADA_INVALIDA",
      "Paginação de avaliações inválida.",
    );
  return { limit, offset };
}

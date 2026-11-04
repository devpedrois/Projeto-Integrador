import type { IndicadoresAdmin } from "@/services/contracts/indicadores-admin.contract";
import { ServiceError } from "@/services/errors";

function contador(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function lerIndicadoresAdmin(value: unknown): IndicadoresAdmin {
  const invalida = () =>
    new ServiceError("RESPOSTA_INVALIDA", "Resposta de indicadores inválida.");
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw invalida();
  const {
    artesaosAtivos,
    produtosAtivos,
    pedidosConfirmados,
    receitaTotal,
    atualizadoEm,
  } = value as Record<string, unknown>;
  if (
    !contador(artesaosAtivos) ||
    !contador(produtosAtivos) ||
    !contador(pedidosConfirmados) ||
    typeof receitaTotal !== "string" ||
    !/^(0|[1-9]\d*)\.\d{2}$/.test(receitaTotal) ||
    typeof atualizadoEm !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(atualizadoEm) ||
    !Number.isFinite(Date.parse(atualizadoEm)) ||
    new Date(atualizadoEm).toISOString() !== atualizadoEm
  )
    throw invalida();
  return {
    artesaosAtivos,
    produtosAtivos,
    pedidosConfirmados,
    receitaTotal,
    atualizadoEm,
  };
}

import type { IndicadoresArtesao } from "@/services/contracts/indicadores-artesao.contract";
import { ServiceError } from "@/services/errors";

function contador(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function instante(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) &&
    Number.isFinite(Date.parse(value))
  );
}

export function lerIndicadoresArtesao(value: unknown): IndicadoresArtesao {
  const invalida = () =>
    new ServiceError("RESPOSTA_INVALIDA", "Resposta de indicadores inválida.");
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw invalida();
  const {
    quantidadeVendida,
    receitaTotal,
    numeroPedidos,
    ultimaVenda,
    atualizadoEm,
  } = value as Record<string, unknown>;
  if (
    !contador(quantidadeVendida) ||
    !contador(numeroPedidos) ||
    typeof receitaTotal !== "number" ||
    !Number.isFinite(receitaTotal) ||
    receitaTotal < 0 ||
    !Number.isSafeInteger(Math.round(receitaTotal * 100)) ||
    Math.abs(receitaTotal * 100 - Math.round(receitaTotal * 100)) > 0.00001 ||
    !instante(atualizadoEm) ||
    (ultimaVenda !== null && !instante(ultimaVenda)) ||
    (numeroPedidos === 0
      ? quantidadeVendida !== 0 || receitaTotal !== 0 || ultimaVenda !== null
      : quantidadeVendida < numeroPedidos || ultimaVenda === null)
  )
    throw invalida();
  return {
    quantidadeVendida,
    receitaTotal,
    numeroPedidos,
    ultimaVenda,
    atualizadoEm,
  };
}

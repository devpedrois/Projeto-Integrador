import { ServiceError } from "@/services/errors";

export function obterFonteDados(): "http" | "fake" {
  const source = process.env.NEXT_PUBLIC_DATA_SOURCE;
  if (source === undefined || source === "" || source === "fake") return "fake";
  if (source === "http") return "http";
  throw new ServiceError("CONFIGURACAO_INVALIDA", "Fonte de dados inválida.");
}

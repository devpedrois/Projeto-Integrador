export type RecomendacaoIndisponivelMotivo =
  "timeout" | "rede" | "status" | "resposta-invalida";

export class RecomendacaoIndisponivelError extends Error {
  public constructor(public readonly motivo: RecomendacaoIndisponivelMotivo) {
    super("Servico de recomendacao indisponivel.");
    this.name = "RecomendacaoIndisponivelError";
  }
}

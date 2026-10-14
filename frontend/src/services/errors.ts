export class ServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

const CODIGOS_HTTP: Readonly<Record<number, readonly string[]>> = {
  400: ["VALIDACAO", "CADASTRO_INVALIDO", "PAPEL_INVALIDO"],
  401: ["NAO_AUTENTICADO", "CREDENCIAIS_INVALIDAS"],
  403: ["ACESSO_NEGADO"],
  404: [
    "NAO_ENCONTRADO",
    "USUARIO_NAO_ENCONTRADO",
    "PRODUTO_NAO_ENCONTRADO",
    "ARTESAO_NAO_ENCONTRADO",
    "PEDIDO_NAO_ENCONTRADO",
  ],
  409: [
    "CONFLITO",
    "EMAIL_JA_CADASTRADO",
    "ESTOQUE_INSUFICIENTE",
    "AVALIACAO_DUPLICADA",
  ],
};
const ERROS_HTTP: Readonly<Record<number, readonly [string, string]>> = {
  400: ["VALIDACAO", "Dados inválidos. Confira e tente novamente."],
  401: ["NAO_AUTENTICADO", "Entre na sua conta para continuar."],
  403: ["ACESSO_NEGADO", "Sua conta não tem permissão para esta ação."],
  404: ["NAO_ENCONTRADO", "Recurso não encontrado."],
  409: ["CONFLITO", "Não foi possível concluir esta ação."],
  429: ["MUITAS_SOLICITACOES", "Aguarde antes de tentar novamente."],
};

export function paraErroHttp(status: number, body?: unknown): ServiceError {
  const [fallback, message] = ERROS_HTTP[status] ?? [
    "SERVICO_INDISPONIVEL",
    "Serviço indisponível. Tente novamente.",
  ];
  let code = fallback;
  if (typeof body === "object" && body !== null && "error" in body) {
    const error = body.error;
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string" &&
      CODIGOS_HTTP[status]?.includes(error.code)
    )
      code = error.code;
  }
  if (
    status === 409 &&
    code === "ESTOQUE_INSUFICIENTE" &&
    typeof body === "object" &&
    body !== null &&
    "error" in body
  ) {
    const error = body.error;
    if (typeof error === "object" && error !== null && "details" in error) {
      const details = error.details;
      if (
        typeof details === "object" &&
        details !== null &&
        "produtoId" in details &&
        "nome" in details &&
        typeof details.produtoId === "string" &&
        details.produtoId.length <= 100 &&
        typeof details.nome === "string" &&
        details.nome.trim() &&
        details.nome.length <= 200
      ) {
        return new ServiceError(
          code,
          `Estoque insuficiente para "${details.nome}".`,
          { produtoId: details.produtoId, nome: details.nome },
        );
      }
    }
  }
  return new ServiceError(code, message);
}

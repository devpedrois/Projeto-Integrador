import { ServiceError, paraErroHttp } from "@/services/errors";

interface ApiClientOptions {
  timeoutMs?: number;
}
interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

export class ApiClient {
  private readonly timeoutMs: number;

  constructor(options: ApiClientOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 10_000;
    if (
      !Number.isFinite(this.timeoutMs) ||
      this.timeoutMs <= 0 ||
      this.timeoutMs > 60_000
    ) {
      throw new ServiceError("ENTRADA_INVALIDA", "Tempo de espera inválido.");
    }
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
      throw new ServiceError(
        "ENTRADA_INVALIDA",
        "Destino de requisição inválido.",
      );
    }
    let body: string | undefined;
    try {
      body =
        options.body === undefined ? undefined : JSON.stringify(options.body);
    } catch {
      throw new ServiceError(
        "ENTRADA_INVALIDA",
        "Dados de requisição inválidos.",
      );
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(
          new ServiceError(
            "TIMEOUT",
            "A solicitação demorou demais. Tente novamente.",
          ),
        );
      }, this.timeoutMs);
    });
    const execute = async (): Promise<T> => {
      const response = await fetch(`/api${path}`, {
        method: options.method ?? "GET",
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        ...(body !== undefined ? { body } : {}),
      });
      if (response.status === 204) return undefined as T;
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        if (!response.ok) throw paraErroHttp(response.status);
        throw new ServiceError(
          "RESPOSTA_INVALIDA",
          "Resposta do serviço inválida.",
        );
      }
      if (!response.ok) throw paraErroHttp(response.status, data);
      return data as T;
    };
    try {
      return await Promise.race([execute(), timeout]);
    } catch (error: unknown) {
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(
        "ERRO_REDE",
        "Não foi possível conectar. Tente novamente.",
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

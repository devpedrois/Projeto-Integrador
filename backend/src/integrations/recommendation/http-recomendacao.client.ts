import { z } from "zod";
import type { Environment } from "../../config/environment.js";
import { RecomendacaoIndisponivelError } from "../../errors/recomendacao-indisponivel.error.js";
import type {
  RecomendacaoContexto,
  RecomendacaoSelecao,
  RecomendacaoStrategy,
} from "./recomendacao.strategy.js";

const selecaoSchema = z.strictObject({
  estrategia: z.enum(["categoria", "historico-compra", "fallback-geral"]),
  produtoIds: z.array(z.uuid()).max(8),
});

export type RecomendacaoHttpConfig = Pick<
  Environment,
  "RECOMENDACAO_URL" | "RECOMENDACAO_SERVICE_TOKEN"
> &
  Partial<Pick<Environment, "RECOMENDACAO_TIMEOUT_MS">>;

export class HttpRecomendacaoClient implements RecomendacaoStrategy {
  public constructor(private readonly config: RecomendacaoHttpConfig) {}

  public async obter(
    contexto: RecomendacaoContexto,
  ): Promise<RecomendacaoSelecao> {
    const url = new URL(
      contexto.usuarioId ? "/recomendacoes/historico" : "/recomendacoes",
      this.config.RECOMENDACAO_URL,
    );
    if (contexto.usuarioId)
      url.searchParams.set("usuarioId", contexto.usuarioId);
    else if (contexto.produtoId)
      url.searchParams.set("produtoId", contexto.produtoId);
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.RECOMENDACAO_TIMEOUT_MS ?? 800,
    );
    try {
      const response = await fetch(url, {
        headers: { "X-Service-Token": this.config.RECOMENDACAO_SERVICE_TOKEN },
        signal: controller.signal,
        redirect: "manual",
      });
      if (response.status !== 200) {
        await response.body?.cancel().catch(() => undefined);
        throw new RecomendacaoIndisponivelError("status");
      }
      let body: unknown;
      try {
        body = await response.json();
      } catch (error) {
        if (error instanceof SyntaxError)
          throw new RecomendacaoIndisponivelError("resposta-invalida");
        throw error;
      }
      const result = selecaoSchema.safeParse(body);
      if (!result.success)
        throw new RecomendacaoIndisponivelError("resposta-invalida");
      return result.data;
    } catch (error) {
      if (error instanceof RecomendacaoIndisponivelError) throw error;
      throw new RecomendacaoIndisponivelError(
        controller.signal.aborted ? "timeout" : "rede",
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

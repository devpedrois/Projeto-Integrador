import { performance } from "node:perf_hooks";
import type { Response } from "express";
import { CachePublico, MemoryCacheStore, type EstadoCache } from "./cache.js";

export interface RegistroCache {
  rota: string;
  cache: EstadoCache;
  duracaoMs: number;
}
export type LogCache = (registro: RegistroCache) => void;
const logPadrao: LogCache = (registro) =>
  console.info(JSON.stringify(registro));

export class CacheHttp {
  constructor(
    private readonly cache = new CachePublico(new MemoryCacheStore(), 60000),
    private readonly log: LogCache = logPadrao,
  ) {}

  async responder<T>(
    response: Response,
    rota: string,
    chave: string | undefined,
    carregar: () => Promise<T>,
  ): Promise<void> {
    const inicio = performance.now();
    let estado: EstadoCache = "MISS";
    response.set("Cache-Control", "no-store");
    response.set("X-Cache", estado);
    response.once("finish", () => {
      this.log({
        rota,
        cache: estado,
        duracaoMs: Number((performance.now() - inicio).toFixed(3)),
      });
    });
    const resultado = await this.cache.obter(chave, carregar);
    estado = resultado.estado;
    response.set("X-Cache", estado);
    response.set(
      "Server-Timing",
      `cache;dur=${(performance.now() - inicio).toFixed(3)}`,
    );
    response.json(resultado.valor);
  }
}

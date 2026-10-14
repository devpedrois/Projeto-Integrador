export interface CacheStore {
  get<T>(chave: string): Promise<T | undefined>;
  set<T>(chave: string, valor: T, ttlMs: number): Promise<void>;
  invalidarPorPrefixo(prefixo: string): Promise<void>;
}

interface Entrada {
  valor: unknown;
  expiraEm: number;
}

export class MemoryCacheStore implements CacheStore {
  private readonly entradas = new Map<string, Entrada>();
  constructor(private readonly limite = 500) {
    if (!Number.isSafeInteger(limite) || limite < 1)
      throw new RangeError("Limite de cache invalido.");
  }

  async get<T>(chave: string): Promise<T | undefined> {
    const entrada = this.entradas.get(chave);
    if (!entrada) return undefined;
    if (entrada.expiraEm <= Date.now()) {
      this.entradas.delete(chave);
      return undefined;
    }
    this.entradas.delete(chave);
    this.entradas.set(chave, entrada);
    return structuredClone(entrada.valor) as T;
  }

  async set<T>(chave: string, valor: T, ttlMs: number): Promise<void> {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0)
      throw new RangeError("TTL de cache invalido.");
    const agora = Date.now();
    const entrada = { valor: structuredClone(valor), expiraEm: agora + ttlMs };
    for (const [key, value] of this.entradas) {
      if (value.expiraEm <= agora) this.entradas.delete(key);
    }
    this.entradas.delete(chave);
    if (this.entradas.size >= this.limite) {
      const antiga = this.entradas.keys().next().value;
      if (antiga !== undefined) this.entradas.delete(antiga);
    }
    this.entradas.set(chave, entrada);
  }

  async invalidarPorPrefixo(prefixo: string): Promise<void> {
    for (const chave of this.entradas.keys()) {
      if (chave.startsWith(prefixo)) this.entradas.delete(chave);
    }
  }
}

export function chaveCache(
  prefixo: string,
  query: Record<string, string | number | undefined>,
): string {
  const entradas = Object.entries(query)
    .filter(([, valor]) => valor !== undefined && valor !== "")
    .map(
      ([campo, valor]) =>
        [
          campo,
          typeof valor === "string" ? valor.trim().toLowerCase() : valor,
        ] as const,
    )
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `${prefixo}:${JSON.stringify(entradas)}`;
}

export type EstadoCache = "HIT" | "MISS";
export class CachePublico {
  private revisao = 0;
  private mutacoes: Promise<void> = Promise.resolve();
  constructor(
    private readonly store: CacheStore,
    private readonly ttlMs: number,
  ) {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0)
      throw new RangeError("TTL de cache invalido.");
  }

  private enfileirar(mutacao: () => Promise<void>): Promise<void> {
    const operacao = this.mutacoes.then(mutacao);
    this.mutacoes = operacao.catch(() => {});
    return operacao;
  }

  async obter<T>(
    chave: string | undefined,
    carregar: () => Promise<T>,
  ): Promise<{ valor: T; estado: EstadoCache }> {
    if (chave === undefined) return { valor: await carregar(), estado: "MISS" };
    await this.mutacoes;
    const revisao = this.revisao;
    const existente = await this.store.get<T>(chave);
    if (existente !== undefined && revisao === this.revisao)
      return { valor: existente, estado: "HIT" };
    const valor = await carregar();
    await this.enfileirar(async () => {
      if (revisao === this.revisao)
        await this.store.set(chave, valor, this.ttlMs);
    });
    return { valor, estado: "MISS" };
  }

  invalidarCatalogo(): Promise<void> {
    this.revisao += 1;
    return this.enfileirar(async () => {
      await this.store.invalidarPorPrefixo("produtos:");
      await this.store.invalidarPorPrefixo("recomendacoes:");
    });
  }
}

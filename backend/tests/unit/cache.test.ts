import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CachePublico,
  MemoryCacheStore,
  chaveCache,
} from "../../src/utils/cache.js";

afterEach(() => {
  vi.useRealTimers();
});
describe("MemoryCacheStore", () => {
  it("expira no TTL sem renovar a validade durante leituras", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
    const cache = new MemoryCacheStore(3);
    await cache.set("produtos:1", { nome: "Vaso" }, 1000);
    vi.advanceTimersByTime(999);
    expect(await cache.get("produtos:1")).toEqual({ nome: "Vaso" });
    vi.advanceTimersByTime(1);
    expect(await cache.get("produtos:1")).toBeUndefined();
  });
  it("limita entradas descartando a menos recentemente usada", async () => {
    const cache = new MemoryCacheStore(2);
    await cache.set("a", 1, 1000);
    await cache.set("b", 2, 1000);
    expect(await cache.get("a")).toBe(1);
    await cache.set("c", 3, 1000);
    expect(await cache.get("b")).toBeUndefined();
    expect(await cache.get("a")).toBe(1);
    expect(await cache.get("c")).toBe(3);
  });
  it("remove expiradas antes de descartar uma entrada valida", async () => {
    vi.useFakeTimers();
    const cache = new MemoryCacheStore(2);
    await cache.set("valida", 1, 1000);
    await cache.set("expirada", 2, 10);
    vi.advanceTimersByTime(10);
    await cache.set("nova", 3, 1000);
    expect(await cache.get("valida")).toBe(1);
    expect(await cache.get("nova")).toBe(3);
  });
  it("invalida somente o prefixo solicitado", async () => {
    const cache = new MemoryCacheStore();
    for (const key of ["produtos:lista", "produtos:detalhe", "recomendacoes:1"])
      await cache.set(key, [], 1000);
    await cache.invalidarPorPrefixo("produtos:");
    expect(await cache.get("produtos:lista")).toBeUndefined();
    expect(await cache.get("produtos:detalhe")).toBeUndefined();
    expect(await cache.get("recomendacoes:1")).toEqual([]);
  });
  it("isola objetos retornados e objetos recebidos", async () => {
    const cache = new MemoryCacheStore();
    const input = { estoque: 5 };
    await cache.set("p", input, 1000);
    input.estoque = 0;
    const obtido = await cache.get<{ estoque: number }>("p");
    if (!obtido) throw new Error("Entrada ausente");
    obtido.estoque = 10;
    expect(await cache.get("p")).toEqual({ estoque: 5 });
  });
  it.each([0, -1, Infinity, NaN, 1.5])(
    "rejeita limite invalido %s",
    (limite) => {
      expect(() => new MemoryCacheStore(limite)).toThrow(RangeError);
    },
  );
  it.each([0, -1, Infinity, NaN])("rejeita TTL invalido %s", async (ttl) => {
    await expect(new MemoryCacheStore().set("p", 1, ttl)).rejects.toThrow(
      RangeError,
    );
  });
});
describe("cache publico", () => {
  it("normaliza ordem, termo vazio, espacos e UUID maiusculo", () => {
    const id = "AB713938-496C-4E86-9FBC-75B3D67444AF";
    expect(
      chaveCache("produtos:lista", {
        termo: " VASO ",
        artesaoId: id,
        limit: 24,
        offset: 0,
      }),
    ).toBe(
      chaveCache("produtos:lista", {
        offset: 0,
        limit: 24,
        artesaoId: id.toLowerCase(),
        termo: "vaso",
      }),
    );
    expect(chaveCache("produtos:lista", { termo: "", limit: 24 })).toBe(
      chaveCache("produtos:lista", { limit: 24 }),
    );
    expect(chaveCache("produtos:lista", { termo: "vaso", offset: 0 })).not.toBe(
      chaveCache("produtos:lista", { termo: "vaso", offset: 1 }),
    );
  });
  it("nao armazena erros nem respostas sem chave publica", async () => {
    const cache = new CachePublico(new MemoryCacheStore(), 1000);
    await expect(
      cache.obter("produtos:p", async () => {
        throw new Error("Falha");
      }),
    ).rejects.toThrow("Falha");
    expect((await cache.obter("produtos:p", async () => "valido")).estado).toBe(
      "MISS",
    );
    expect((await cache.obter(undefined, async () => "privado")).estado).toBe(
      "MISS",
    );
    expect((await cache.obter(undefined, async () => "privado")).estado).toBe(
      "MISS",
    );
  });
  it("leitura iniciada antes da invalidacao nao repovoa dados antigos", async () => {
    const cache = new CachePublico(new MemoryCacheStore(), 1000);
    let liberar: (value: string) => void = () => {
      throw new Error("Carga nao iniciada");
    };
    let iniciar: () => void = () => {};
    const iniciada = new Promise<void>((resolve) => {
      iniciar = resolve;
    });
    const pendente = cache.obter("produtos:p", () => {
      iniciar();
      return new Promise<string>((resolve) => {
        liberar = resolve;
      });
    });
    await iniciada;
    await cache.invalidarCatalogo();
    liberar("antigo");
    await pendente;
    expect(await cache.obter("produtos:p", async () => "novo")).toEqual({
      valor: "novo",
      estado: "MISS",
    });
    expect(await cache.obter("produtos:p", async () => "incorreto")).toEqual({
      valor: "novo",
      estado: "HIT",
    });
  });
});

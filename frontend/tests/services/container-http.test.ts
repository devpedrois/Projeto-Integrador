import { afterEach, expect, it, vi } from "vitest";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("HTTP nao consulta localStorage nem substitui adapters por fake", async () => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http");
  vi.resetModules();
  vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
    throw new Error("fake proibida");
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        id: "u1",
        nome: "Ana",
        email: "ana@origem.test",
        papel: "comprador",
      }),
    ),
  );
  const container = await import("@/services/fake/container");
  expect(container.PENDENTES_HTTP).toContain("ProdutosService");
  await expect(container.obterProdutosService().list()).rejects.toMatchObject({
    code: "HTTP_NAO_IMPLEMENTADO",
  });
  const store = container.obterSessionStore();
  await store.hidratar();
  expect(store.getSnapshot()?.nome).toBe("Ana");
  const carrinho = container.obterCarrinhoStore("u1");
  expect(() =>
    carrinho.adicionar(
      {
        id: "p1",
        nome: "Peca sintetica",
        descricao: "Teste",
        preco: 10,
        categoriaId: "c1",
        tecnicaId: "t1",
        regiaoId: "r1",
        artesaoId: "a1",
        fotos: [],
        quantidadeEstoque: 2,
        quantidadeVendida: 0,
        notaMedia: 0,
        ativo: true,
        criadoEm: "2026-10-14T00:00:00Z",
      },
      1,
    ),
  ).toThrow();
  expect(carrinho.getSnapshot().itens).toEqual([]);
});
it("HTTP informa pendencias apenas em desenvolvimento", async () => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http");
  vi.stubEnv("NODE_ENV", "development");
  vi.resetModules();
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const container = await import("@/services/fake/container");
  container.obterUsuariosService();
  expect(warn).toHaveBeenCalled();
});
it("fonte desconhecida falha explicitamente", async () => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "errada");
  vi.resetModules();
  const container = await import("@/services/fake/container");
  expect(() => container.obterUsuariosService()).toThrow();
});

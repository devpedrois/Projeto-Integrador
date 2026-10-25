import { afterEach, expect, it, vi } from "vitest";

const dados = {
  quantidadeVendida: 2,
  receitaTotal: 20,
  numeroPedidos: 1,
  ultimaVenda: "2026-10-13T12:00:00.000Z",
  atualizadoEm: "2026-10-25T12:00:00.000Z",
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("seleciona HTTP explicitamente e nao usa storage privado", async () => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http");
  vi.resetModules();
  const storage = vi.spyOn(Storage.prototype, "getItem");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(dados)));
  const container = await import("@/services/fake/container");
  expect(await container.obterIndicadoresArtesaoService().obter()).toEqual(
    dados,
  );
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({}, { status: 503 }));
  await expect(
    container.obterIndicadoresArtesaoService().obter(),
  ).rejects.toMatchObject({ code: "SERVICO_INDISPONIVEL" });
  expect(storage).not.toHaveBeenCalled();
});

it("seleciona fake explicitamente, exige artesao e nao faz fetch", async () => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "fake");
  vi.resetModules();
  window.localStorage.clear();
  vi.stubGlobal("fetch", vi.fn());
  const container = await import("@/services/fake/container");
  const store = container.obterSessionStore();
  store.login({
    id: "seed-artesao-01",
    nome: "João Artesão",
    email: "joao.artesao@origem.test",
    papel: "artesao",
  });
  const resultado = await container.obterIndicadoresArtesaoService().obter();
  expect(resultado).toMatchObject({
    quantidadeVendida: 0,
    receitaTotal: 0,
    numeroPedidos: 0,
    ultimaVenda: null,
  });
  store.login({
    id: "seed-comprador-01",
    nome: "Ana",
    email: "ana.compradora@origem.test",
    papel: "comprador",
  });
  await expect(
    container.obterIndicadoresArtesaoService().obter(),
  ).rejects.toMatchObject({ code: "NAO_AUTENTICADO" });
  expect(fetch).not.toHaveBeenCalled();
});

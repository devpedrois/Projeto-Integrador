import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("compoe HTTP para indicadores administrativos", async () => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http");
  const dados = {
    artesaosAtivos: 0,
    produtosAtivos: 0,
    pedidosConfirmados: 0,
    receitaTotal: "0.00",
    atualizadoEm: "2026-11-04T12:00:00.000Z",
  };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(dados)));
  const { obterIndicadoresAdminService } =
    await import("@/services/fake/container");
  expect(await obterIndicadoresAdminService()?.obter()).toEqual(dados);
});

it("omite indicadores no modo fake sem criar adapter sintetico", async () => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "fake");
  vi.stubGlobal("fetch", vi.fn());
  const { obterIndicadoresAdminService } =
    await import("@/services/fake/container");
  expect(obterIndicadoresAdminService()).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

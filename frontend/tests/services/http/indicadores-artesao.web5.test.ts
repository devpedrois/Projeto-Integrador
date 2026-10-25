import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HttpIndicadoresArtesaoService } from "@/services/http/indicadores-artesao.service";

const indicadores = {
  quantidadeVendida: 10,
  receitaTotal: 51.83,
  numeroPedidos: 2,
  ultimaVenda: "2026-10-13T12:00:00.000Z",
  atualizadoEm: "2026-10-25T12:00:00.000Z",
};
beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => vi.unstubAllGlobals());

it("le indicadores privados sem enviar identidade externa", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({ ...indicadores, privado: "descartar" }),
  );
  expect(await new HttpIndicadoresArtesaoService().obter()).toEqual(
    indicadores,
  );
  expect(fetch).toHaveBeenCalledWith(
    "/api/artesao/indicadores",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }),
  );
});

it("aceita ausencia de vendas e preserva data da consulta", async () => {
  const vazio = {
    ...indicadores,
    quantidadeVendida: 0,
    receitaTotal: 0,
    numeroPedidos: 0,
    ultimaVenda: null,
  };
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(vazio));
  expect(await new HttpIndicadoresArtesaoService().obter()).toEqual(vazio);
});

it.each([
  null,
  [],
  {},
  { ...indicadores, quantidadeVendida: -1 },
  { ...indicadores, quantidadeVendida: 1.5 },
  { ...indicadores, quantidadeVendida: Number.MAX_SAFE_INTEGER + 1 },
  { ...indicadores, receitaTotal: "51.83" },
  { ...indicadores, receitaTotal: -1 },
  { ...indicadores, receitaTotal: 51.831 },
  { ...indicadores, numeroPedidos: -1 },
  { ...indicadores, numeroPedidos: 1.5 },
  { ...indicadores, atualizadoEm: "ontem" },
  { ...indicadores, ultimaVenda: "ontem" },
  { ...indicadores, numeroPedidos: 0, ultimaVenda: null },
])("rejeita payload invalido antes de exibir valores: %#", async (dados) => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(dados));
  await expect(
    new HttpIndicadoresArtesaoService().obter(),
  ).rejects.toMatchObject({ code: "RESPOSTA_INVALIDA" });
});

it.each([401, 403, 503])(
  "propaga HTTP %i sem fallback local",
  async (status) => {
    const storage = vi.spyOn(Storage.prototype, "getItem");
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({}, { status }));
    await expect(
      new HttpIndicadoresArtesaoService().obter(),
    ).rejects.toBeInstanceOf(Error);
    expect(storage).not.toHaveBeenCalled();
    storage.mockRestore();
  },
);

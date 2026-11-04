import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HttpAvaliacoesService } from "@/services/http/avaliacoes.service";

const produtoId = "11111111-1111-4111-8111-111111111111";
const itens = Array.from({ length: 5 }, (_, indice) => ({
  id: `nota-${indice}`,
  produtoId,
  nota: 4,
  comentario: "Compra sintetica",
  criadoEm: "2026-10-01T12:00:00.000Z",
}));
beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => vi.unstubAllGlobals());

it("le ultima pagina com resumo global e descarta identidade extra", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({
      itens: itens.map((item) => ({
        ...item,
        compradorId: "descartar",
        email: "privado@teste.origem",
      })),
      resumo: { media: 4.4, total: 35 },
    }),
  );
  expect(
    await new HttpAvaliacoesService().listarPagina(produtoId, {
      limit: 10,
      offset: 30,
    }),
  ).toEqual({
    itens,
    resumo: { media: 4.4, total: 35 },
  });
  expect(fetch).toHaveBeenCalledWith(
    `/api/avaliacoes?produtoId=${produtoId}&limit=10&offset=30`,
    expect.objectContaining({ credentials: "include", cache: "no-store" }),
  );
});

it("aceita pagina fora do total sem apagar resumo", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({ itens: [], resumo: { media: 4.4, total: 35 } }),
  );
  expect(
    await new HttpAvaliacoesService().listarPagina(produtoId, { offset: 40 }),
  ).toEqual({ itens: [], resumo: { media: 4.4, total: 35 } });
});

it.each([
  { limit: 0 },
  { limit: 51 },
  { limit: 1.5 },
  { offset: -1 },
  { offset: Number.MAX_SAFE_INTEGER + 1 },
])("rejeita paginacao invalida antes do HTTP: %j", async (paginacao) => {
  await expect(
    new HttpAvaliacoesService().listarPagina(produtoId, paginacao),
  ).rejects.toMatchObject({ code: "ENTRADA_INVALIDA" });
  expect(fetch).not.toHaveBeenCalled();
});

it("rejeita pagina incompleta ou itens duplicados", async () => {
  const service = new HttpAvaliacoesService();
  for (const pagina of [
    itens.slice(0, 4),
    [itens[0], itens[0], itens[2], itens[3], itens[4]],
  ]) {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ itens: pagina, resumo: { media: 4.4, total: 35 } }),
    );
    await expect(
      service.listarPagina(produtoId, { offset: 30 }),
    ).rejects.toMatchObject({ code: "RESPOSTA_INVALIDA" });
  }
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpAvaliacoesService } from "@/services/http/avaliacoes.service";

const produtoId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Web.4 elegibilidade HTTP", () => {
  it.each([
    { podeAvaliar: true, motivo: null },
    { podeAvaliar: false, motivo: "nao_comprou" },
    { podeAvaliar: false, motivo: "ja_avaliou" },
  ])("consulta sessao e valida resposta %j", async (resposta) => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ ...resposta, compradorId: "descartar" }),
    );
    expect(
      await new HttpAvaliacoesService().elegibilidade(
        produtoId.toUpperCase(),
        "identidade-ignorada",
      ),
    ).toEqual(resposta);
    expect(fetch).toHaveBeenCalledWith(
      `/api/avaliacoes/elegibilidade?produtoId=${produtoId}`,
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }),
    );
  });

  it.each([
    { podeAvaliar: true, motivo: "nao_comprou" },
    { podeAvaliar: false, motivo: null },
    { podeAvaliar: false, motivo: "outro" },
    { podeAvaliar: false, motivo: ["nao_comprou"] },
    { podeAvaliar: "true", motivo: null },
    {},
  ])("nao concede acesso com resposta invalida %j", async (resposta) => {
    vi.mocked(fetch).mockResolvedValue(Response.json(resposta));
    await expect(
      new HttpAvaliacoesService().elegibilidade(produtoId, "ignorado"),
    ).rejects.toMatchObject({ code: "RESPOSTA_INVALIDA" });
  });

  it("valida UUID antes de consultar", async () => {
    await expect(
      new HttpAvaliacoesService().elegibilidade("invalido", "ignorado"),
    ).rejects.toMatchObject({ code: "ENTRADA_INVALIDA" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("preserva codigo estavel de compra nao verificada no POST", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json(
        { error: { code: "COMPRA_NAO_VERIFICADA" } },
        { status: 403 },
      ),
    );
    await expect(
      new HttpAvaliacoesService().criar({ produtoId, nota: 5 }, "ignorado"),
    ).rejects.toMatchObject({ code: "COMPRA_NAO_VERIFICADA" });
  });
});

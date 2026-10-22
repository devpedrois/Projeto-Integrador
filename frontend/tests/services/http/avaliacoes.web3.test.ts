import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpAvaliacoesService } from "@/services/http/avaliacoes.service";

const produtoId = "11111111-1111-4111-8111-111111111111";
const avaliacao = {
  id: "22222222-2222-4222-8222-222222222222",
  produtoId,
  compradorId: "33333333-3333-4333-8333-333333333333",
  nota: 4,
  comentario: "Peca bonita",
  criadoEm: "2026-10-22T12:00:00.000Z",
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Web.3 HttpAvaliacoesService", () => {
  it("cria por HTTP, aplica trim e envia somente os campos do corpo", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ ...avaliacao, senhaHash: "descartar" }, { status: 201 }),
    );
    const response = await new HttpAvaliacoesService().criar(
      { produtoId, nota: 4, comentario: "  Peca bonita  " },
      "identidade-nao-enviada",
    );
    expect(response).toEqual(avaliacao);
    expect(fetch).toHaveBeenCalledWith(
      "/api/avaliacoes",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ produtoId, nota: 4, comentario: "Peca bonita" }),
      }),
    );
  });

  it("preserva create como compatibilidade com o contrato AV1", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ ...avaliacao, comentario: undefined }),
    );
    await new HttpAvaliacoesService().create(
      { produtoId, nota: 4, comentario: "   " },
      "ignorado",
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/avaliacoes",
      expect.objectContaining({ body: JSON.stringify({ produtoId, nota: 4 }) }),
    );
  });

  it.each([
    { nota: 0 },
    { nota: 6 },
    { nota: 3.5 },
    { comentario: "a".repeat(501) },
    { produtoId: "invalido" },
    { compradorId: "alheio" },
  ])("rejeita entrada invalida antes do HTTP: %j", async (alteracao) => {
    await expect(
      new HttpAvaliacoesService().criar(
        { produtoId, nota: 4, ...alteracao },
        "ignorado",
      ),
    ).rejects.toMatchObject({ code: "AVALIACAO_INVALIDA" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("propaga 409 como avaliacao duplicada", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json(
        { error: { code: "AVALIACAO_DUPLICADA", message: "Detalhe interno" } },
        { status: 409 },
      ),
    );
    await expect(
      new HttpAvaliacoesService().criar({ produtoId, nota: 4 }, "ignorado"),
    ).rejects.toMatchObject({ code: "AVALIACAO_DUPLICADA" });
  });

  it.each([
    { nota: 3.5 },
    { produtoId: "outro" },
    { compradorId: null },
    { comentario: "a".repeat(501) },
    { criadoEm: "ontem" },
  ])("rejeita resposta fora do contrato: %j", async (alteracao) => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ ...avaliacao, ...alteracao }),
    );
    await expect(
      new HttpAvaliacoesService().criar({ produtoId, nota: 4 }, "ignorado"),
    ).rejects.toMatchObject({ code: "RESPOSTA_INVALIDA" });
  });
});

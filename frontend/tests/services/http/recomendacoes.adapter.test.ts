import { afterEach, describe, expect, it, vi } from "vitest";
import type { Produto } from "@/types/produto";
import type { RecomendacaoContexto } from "@/types/recomendacao";

const contextoId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const usuarioId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const produto: Produto = {
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  nome: "Vaso recomendado",
  descricao: "Sintetico",
  preco: 89.9,
  categoriaId: usuarioId,
  tecnicaId: "tecnica-modelagem-argila",
  regiaoId: "regiao-pilar-recife",
  artesaoId: usuarioId,
  fotos: [{ url: "/produtos/fixture.svg", ordem: 0 }],
  quantidadeEstoque: 4,
  quantidadeVendida: 10,
  notaMedia: 4.5,
  ativo: true,
  criadoEm: "2026-10-14T00:00:00.000Z",
};

async function obterService() {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http");
  vi.resetModules();
  const container = await import("@/services/fake/container");
  return container.obterRecomendacoesService();
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("HttpRecommendationAdapter no container", () => {
  it.each([
    [
      { produtoId: contextoId },
      "/api/recomendacoes?produtoId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    ],
    [
      { usuarioId },
      "/api/recomendacoes?usuarioId=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    ],
  ] as const)(
    "consulta /api/recomendacoes com contexto real: %j",
    async (contexto, destino) => {
      const resposta = { estrategia: "fallback-geral", itens: [produto] };
      const fetchMock = vi.fn().mockResolvedValue(Response.json(resposta));
      vi.stubGlobal("fetch", fetchMock);
      expect(await (await obterService()).obter(contexto)).toEqual(resposta);
      const [url, options] = fetchMock.mock.calls[0] ?? [];
      expect(url).toBe(destino);
      expect(options).toMatchObject({
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
    },
  );

  it("sai de PENDENTES_HTTP sem consultar localStorage", async () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("Fake proibida");
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ estrategia: "categoria", itens: [] }),
        ),
    );
    const service = await obterService();
    const container = await import("@/services/fake/container");
    expect(container.PENDENTES_HTTP).not.toContain("RecomendacoesService");
    expect(await service.obter({ produtoId: contextoId })).toEqual({
      estrategia: "categoria",
      itens: [],
    });
  });

  it("preserva ranking e fallback sem executar ranking local", async () => {
    const itens = [
      produto,
      { ...produto, id: usuarioId, quantidadeVendida: 1000 },
    ];
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ estrategia: "fallback-geral", itens }),
        ),
    );
    expect(
      (await (await obterService()).obter({ produtoId: contextoId })).itens,
    ).toEqual(itens);
  });

  it("exclui o contexto, duplicados e invisiveis antes do limite oito", async () => {
    const itens = Array.from({ length: 10 }, (_, indice) => ({
      ...produto,
      id: `00000000-0000-4000-8000-${String(indice + 1).padStart(12, "0")}`,
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          estrategia: "categoria",
          itens: [
            { ...produto, id: contextoId },
            itens[0],
            itens[0],
            { ...produto, id: usuarioId, ativo: false },
            {
              ...produto,
              id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
              quantidadeEstoque: 0,
            },
            {
              ...produto,
              id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
              desativadoPorAdmin: true,
            },
            ...itens.slice(1),
          ],
        }),
      ),
    );
    const resultado = await (
      await obterService()
    ).obter({ produtoId: contextoId.toUpperCase() });
    expect(resultado.itens).toEqual(itens.slice(0, 8));
  });

  it.each([
    null,
    [],
    {},
    { estrategia: "", itens: [] },
    { estrategia: 3, itens: [] },
    { estrategia: "categoria", itens: [{ ...produto, preco: "89.90" }] },
    { estrategia: "categoria", itens: [{ ...produto, fotos: ["url"] }] },
    { estrategia: "categoria", itens: [{ ...produto, notaMedia: 7 }] },
  ])("rejeita resposta fora do contrato: %j", async (resposta) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(resposta)));
    await expect(
      (await obterService()).obter({ produtoId: contextoId }),
    ).rejects.toMatchObject({ code: "RESPOSTA_INVALIDA" });
  });

  it.each([
    {},
    { produtoId: contextoId, usuarioId },
    { produtoId: "" },
    { produtoId: contextoId, extra: true },
    { usuarioId: [] },
    { produtoId: "x&usuarioId=y" },
  ])("rejeita contexto invalido antes da rede: %j", async (contexto) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      (await obterService()).obter(contexto as RecomendacaoContexto),
    ).rejects.toMatchObject({ code: "ENTRADA_INVALIDA" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([400, 503])("propaga HTTP %s sem fallback fake", async (status) => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ message: "Detalhe interno secreto" }, { status }),
        ),
    );
    await expect(
      (await obterService()).obter({ produtoId: contextoId }),
    ).rejects.toMatchObject({
      code: status === 400 ? "VALIDACAO" : "SERVICO_INDISPONIVEL",
    });
  });

  it("propaga falha de rede", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("rede indisponivel")),
    );
    await expect(
      (await obterService()).obter({ produtoId: contextoId }),
    ).rejects.toMatchObject({ code: "ERRO_REDE" });
  });
});

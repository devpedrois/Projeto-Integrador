import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import type { Produto } from "@/types/produto";
import type { ProdutoDTO } from "../../../../backend/src/utils/produto-dto";
import { HttpProdutosService } from "@/services/http/produtos.service";
import { HttpOpcoesFiltroService } from "@/services/http/opcoes-filtro.service";
import { HttpAvaliacoesService } from "@/services/http/avaliacoes.service";

const produto: Produto = {
  id: "c820b0b5-1bc3-41a0-bb4d-c655c6ac1252",
  nome: "Vaso sintetico",
  descricao: "Barro",
  preco: 89.9,
  categoriaId: "226bbf12-77a5-42f0-9081-246d3ff89c99",
  tecnicaId: "tecnica-modelagem-argila",
  regiaoId: "regiao-alto-moura-caruaru",
  artesaoId: "bdc970c1-2b87-467e-80f3-d5d7100780a7",
  fotos: [{ url: "https://example.test/foto.jpg", ordem: 0 }],
  quantidadeEstoque: 4,
  quantidadeVendida: 2,
  notaMedia: 4.5,
  ativo: true,
  criadoEm: "2026-10-14T00:00:00.000Z",
};

function produtosService() {
  return new HttpProdutosService();
}
function opcoesService() {
  return new HttpOpcoesFiltroService();
}
function avaliacoesService() {
  return new HttpAvaliacoesService();
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("HTTP catalogo", () => {
  it("mantem ProdutoDTO compativel com o tipo Produto do frontend", () => {
    expectTypeOf<ProdutoDTO>().toMatchTypeOf<Produto>();
    expectTypeOf<keyof ProdutoDTO>().toEqualTypeOf<keyof Produto>();
  });
  it("lista e combina filtros pelos nomes do contrato backend", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => Response.json([produto]));
    vi.stubGlobal("fetch", fetchMock);
    const service = await produtosService();
    expect(await service.list()).toEqual([produto]);
    expect(
      await service.search({
        termo: "vaso & barro",
        categoriaId: produto.categoriaId,
        tecnicaId: produto.tecnicaId,
        regiaoId: produto.regiaoId,
      }),
    ).toEqual([produto]);
    const url = new URL(fetchMock.mock.calls[1]?.[0], "http://localhost");
    expect(url.pathname).toBe("/api/produtos");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      termo: "vaso & barro",
      categoriaId: produto.categoriaId,
      tecnicaId: produto.tecnicaId,
      regiaoId: produto.regiaoId,
    });
    expect(await service.search({ termo: "", categoriaId: undefined })).toEqual(
      [produto],
    );
    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/produtos");
  });

  it("obterPublico traduz 404 em null e preserva falhas recuperaveis", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(produto))
      .mockResolvedValueOnce(
        Response.json(
          { error: { code: "PRODUTO_NAO_ENCONTRADO" } },
          { status: 404 },
        ),
      )
      .mockResolvedValueOnce(Response.json({}, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    const service = await produtosService();
    expect(await service.obterPublico(produto.id)).toEqual(produto);
    expect(await service.obterPublico(produto.id)).toBeNull();
    await expect(service.obterPublico(produto.id)).rejects.toMatchObject({
      code: "SERVICO_INDISPONIVEL",
    });
  });

  it.each([
    { preco: "89.90" },
    { fotos: ["url"] },
    { quantidadeEstoque: -1 },
    { notaMedia: 6 },
    { criadoEm: "ontem" },
  ])("rejeita produto fora do contrato: %j", async (alteracao) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json([{ ...produto, ...alteracao }])),
    );
    await expect((await produtosService()).list()).rejects.toMatchObject({
      code: "RESPOSTA_INVALIDA",
    });
  });

  it("remocao usa DELETE autenticado", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(produto));
    vi.stubGlobal("fetch", fetchMock);
    const service = await produtosService();
    await service.remove(produto.id, produto.artesaoId);
    expect(fetchMock.mock.calls[0]?.[1].method).toBe("DELETE");
  });

  it("carrega categorias, tecnicas e regioes do HTTP", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () =>
        Response.json([{ id: "opcao", nome: "Nome sintetico" }]),
      );
    vi.stubGlobal("fetch", fetchMock);
    const service = await opcoesService();
    expect(await service.categorias()).toEqual([
      { id: "opcao", nome: "Nome sintetico" },
    ]);
    expect(await service.tecnicas()).toHaveLength(1);
    expect(await service.regioes()).toHaveLength(1);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/categorias",
      "/api/tecnicas",
      "/api/regioes",
    ]);
  });

  it("rejeita opcoes malformadas sem fallback fake", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json([{ id: "opcao" }])),
    );
    await expect((await opcoesService()).categorias()).rejects.toMatchObject({
      code: "RESPOSTA_INVALIDA",
    });
  });

  it("adapta itens e resumo total ao contrato de leitura existente", async () => {
    const avaliacao = {
      id: "av1",
      produtoId: produto.id,
      compradorId: "u1",
      nota: 5,
      criadoEm: produto.criadoEm,
    };
    const fetchMock = vi
      .fn()
      .mockImplementation(async () =>
        Response.json({ itens: [avaliacao], resumo: { media: 5, total: 1 } }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const service = await avaliacoesService();
    expect(await service.listByProduto(produto.id)).toEqual([avaliacao]);
    expect(await service.resumo(produto.id)).toEqual({
      produtoId: produto.id,
      media: 5,
      quantidade: 1,
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `/api/avaliacoes?produtoId=${produto.id}`,
    );
  });

  it("resumo de produto oculto fica vazio para o detalhe indisponivel", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({}, { status: 404 })),
    );
    const service = await avaliacoesService();
    expect(await service.resumo(produto.id)).toEqual({
      produtoId: produto.id,
      media: 0,
      quantidade: 0,
    });
    expect(await service.listByProduto(produto.id)).toEqual([]);
  });

  it("rejeita avaliacoes e resumos fora do contrato", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ itens: [], resumo: { media: "5", total: 1 } }),
        ),
    );
    await expect(
      (await avaliacoesService()).resumo(produto.id),
    ).rejects.toMatchObject({ code: "RESPOSTA_INVALIDA" });
  });
});

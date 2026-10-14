import { afterEach, expect, it, vi } from "vitest";

it("HTTP nao possui pendencias depois de WEB-12", async () => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http");
  vi.resetModules();
  const container = await import("@/services/fake/container");
  expect(container.PENDENTES_HTTP).toEqual([]);
});

it("HTTP seleciona adapters reais para todos os services do fluxo comprador", async () => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http");
  vi.resetModules();
  const container = await import("@/services/fake/container");
  const { HttpUsuariosService } =
    await import("@/services/http/usuarios.service");
  const { HttpProdutosService } =
    await import("@/services/http/produtos.service");
  const { HttpOpcoesFiltroService } =
    await import("@/services/http/opcoes-filtro.service");
  const { HttpAvaliacoesService } =
    await import("@/services/http/avaliacoes.service");
  const { HttpPerfilArtesaoService } =
    await import("@/services/http/perfil-artesao.service");
  const { HttpRecommendationAdapter } =
    await import("@/services/http/recomendacoes.adapter");
  const { HttpPedidosService } =
    await import("@/services/http/pedidos.service");

  expect(container.obterUsuariosService()).toBeInstanceOf(HttpUsuariosService);
  expect(container.obterProdutosService()).toBeInstanceOf(HttpProdutosService);
  expect(container.obterOpcoesFiltroService()).toBeInstanceOf(
    HttpOpcoesFiltroService,
  );
  expect(container.obterAvaliacoesService()).toBeInstanceOf(
    HttpAvaliacoesService,
  );
  expect(container.obterPerfilArtesaoService()).toBeInstanceOf(
    HttpPerfilArtesaoService,
  );
  expect(container.obterRecomendacoesService()).toBeInstanceOf(
    HttpRecommendationAdapter,
  );
  expect(container.obterPedidosService()).toBeInstanceOf(HttpPedidosService);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("HTTP usa storage somente para visitante e persiste comprador no servidor", async () => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http");
  vi.resetModules();
  window.localStorage.clear();
  vi.spyOn(Storage.prototype, "getItem").mockImplementation((chave: string) => {
    if (chave !== "origem:v1:carrinho:visitante")
      throw new Error("storage privado proibido");
    return null;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (path: string) =>
      path === "/api/auth/me"
        ? Response.json({
            id: "u1",
            nome: "Ana",
            email: "ana@origem.test",
            papel: "comprador",
          })
        : Response.json({
            itens: [],
            total: 0,
            atualizadoEm: "2026-10-14T00:00:00.000Z",
          }),
    ),
  );
  const container = await import("@/services/fake/container");
  for (const nome of [
    "ProdutosService",
    "AvaliacoesService",
    "OpcoesFiltroService",
  ]) {
    expect(container.PENDENTES_HTTP).not.toContain(nome);
  }
  const fetchMock = vi.mocked(fetch);
  fetchMock.mockResolvedValueOnce(Response.json([]));
  expect(await container.obterProdutosService().list()).toEqual([]);
  fetchMock.mockResolvedValueOnce(Response.json([]));
  expect(await container.obterOpcoesFiltroService().categorias()).toEqual([]);
  fetchMock.mockResolvedValueOnce(
    Response.json({ itens: [], resumo: { media: 0, total: 0 } }),
  );
  expect(await container.obterAvaliacoesService().resumo("p1")).toEqual({
    produtoId: "p1",
    media: 0,
    quantidade: 0,
  });
  const store = container.obterSessionStore();
  await store.hidratar();
  expect(store.getSnapshot()?.nome).toBe("Ana");
  const carrinho = container.obterCarrinhoStore("u1");
  await carrinho.hidratar();
  fetchMock.mockResolvedValueOnce(
    Response.json({
      itens: [
        {
          produtoId: "p1",
          nome: "Peca sintetica",
          precoUnitario: 10,
          quantidade: 1,
          estoqueDisponivel: 2,
        },
      ],
      total: 10,
      atualizadoEm: "2026-10-14T00:00:00.000Z",
    }),
  );
  await carrinho.adicionar(
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
  );
  expect(carrinho.getSnapshot().itens[0]?.quantidade).toBe(1);
  expect(container.PENDENTES_HTTP).not.toContain("CarrinhoStore");
});
it("HTTP nao avisa pendencias inexistentes em desenvolvimento", async () => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http");
  vi.stubEnv("NODE_ENV", "development");
  vi.resetModules();
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const container = await import("@/services/fake/container");
  container.obterUsuariosService();
  expect(warn).not.toHaveBeenCalled();
});
it("fonte desconhecida falha explicitamente", async () => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "errada");
  vi.resetModules();
  const container = await import("@/services/fake/container");
  expect(() => container.obterUsuariosService()).toThrow();
});

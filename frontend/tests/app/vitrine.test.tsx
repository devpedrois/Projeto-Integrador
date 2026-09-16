import { describe, expect, it, vi, beforeEach } from "vitest";
import { useEffect, useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { RecomendacoesService } from "@/services/contracts/recomendacoes.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";
import type { SessionStore } from "@/store/sessao.store";
import type { UsuarioSessao } from "@/types/sessao";
import type { Produto } from "@/types/produto";

let produtosServiceMock: ProdutosService;
let recomendacoesServiceMock: RecomendacoesService;
let opcoesFiltroServiceMock: OpcoesFiltroService;
let sessionStoreMock: SessionStore;

vi.mock("@/services/fake/container", () => ({
  obterProdutosService: () => produtosServiceMock,
  obterRecomendacoesService: () => recomendacoesServiceMock,
  obterOpcoesFiltroService: () => opcoesFiltroServiceMock,
  obterSessionStore: () => sessionStoreMock,
}));

const pushMock = vi.fn((url: string) => {
  const queryString = url.split("?")[1] ?? "";
  emitirNovosParams(new URLSearchParams(queryString));
});
let searchParamsAtual = new URLSearchParams();
let notificarMudanca: (() => void) | null = null;

function emitirNovosParams(params: URLSearchParams) {
  searchParamsAtual = params;
  notificarMudanca?.();
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/",
  useSearchParams: () => {
    const [, forcarAtualizacao] = useState(0);
    useEffect(() => {
      notificarMudanca = () => forcarAtualizacao((n) => n + 1);
      return () => {
        notificarMudanca = null;
      };
    }, []);
    return searchParamsAtual;
  },
}));

function produto(overrides: Partial<Produto> = {}): Produto {
  return {
    id: "produto-1",
    nome: "Vaso de Barro Trancado",
    descricao: "Descricao de teste.",
    preco: 39.9,
    categoriaId: "categoria-ceramica-barro",
    tecnicaId: "tecnica-modelagem-argila",
    regiaoId: "regiao-pilar-recife",
    artesaoId: "artesao-sintetico-pilar",
    fotos: [{ url: "/produtos/ceramica-barro.svg", ordem: 0 }],
    quantidadeEstoque: 10,
    quantidadeVendida: 5,
    notaMedia: 4.5,
    ativo: true,
    criadoEm: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function criarProdutosServiceFake(
  overrides: Partial<ProdutosService> = {}
): ProdutosService {
  return {
    create: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
    listByArtesao: vi.fn().mockResolvedValue([]),
    update: vi.fn(),
    remove: vi.fn(),
    search: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function criarOpcoesFiltroServiceFake(
  overrides: Partial<OpcoesFiltroService> = {}
): OpcoesFiltroService {
  return {
    categorias: vi.fn().mockResolvedValue([]),
    tecnicas: vi.fn().mockResolvedValue([]),
    regioes: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function criarSessionStoreFake(sessao: UsuarioSessao | null): SessionStore {
  return {
    getSnapshot: vi.fn().mockReturnValue(sessao),
    subscribe: vi.fn().mockReturnValue(() => {}),
  } as unknown as SessionStore;
}

beforeEach(() => {
  sessionStoreMock = criarSessionStoreFake(null);
  opcoesFiltroServiceMock = criarOpcoesFiltroServiceFake();
  recomendacoesServiceMock = {
    obter: vi.fn().mockResolvedValue({ estrategia: "categoria", itens: [] }),
  };
  pushMock.mockClear();
  searchParamsAtual = new URLSearchParams();
  notificarMudanca = null;
});

describe("Vitrine (Home)", () => {
  it("mostra carregando e depois a lista de produtos", async () => {
    produtosServiceMock = criarProdutosServiceFake({
      list: vi.fn().mockResolvedValue([produto({ id: "p1", nome: "Vaso de Barro" })]),
    });
    const { default: Home } = await import("@/app/page");

    render(<Home />);

    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByText("Vaso de Barro")).toBeInTheDocument());
  });

  it("mostra estado vazio quando nao ha produtos", async () => {
    produtosServiceMock = criarProdutosServiceFake();
    const { default: Home } = await import("@/app/page");

    render(<Home />);

    expect(await screen.findByText(/nenhum produto dispon/i)).toBeInTheDocument();
  });

  it("mostra erro recuperavel quando o service falha", async () => {
    produtosServiceMock = criarProdutosServiceFake({
      list: vi.fn().mockRejectedValue(new Error("falhou")),
    });
    const { default: Home } = await import("@/app/page");

    render(<Home />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("visitante: usa o produtoId do primeiro produto ativo com estoque como contexto", async () => {
    const destacado = produto({ id: "produto-destacado", ativo: true, quantidadeEstoque: 3 });
    produtosServiceMock = criarProdutosServiceFake({
      list: vi.fn().mockResolvedValue([destacado]),
    });
    const { default: Home } = await import("@/app/page");

    render(<Home />);

    await waitFor(() =>
      expect(recomendacoesServiceMock.obter).toHaveBeenCalledWith({
        produtoId: "produto-destacado",
      })
    );
  });

  it("usuario com sessao restaurada: usa o usuarioId como contexto", async () => {
    sessionStoreMock = criarSessionStoreFake({
      id: "usuario-logado",
      nome: "Ana",
      papel: "comprador",
    });
    produtosServiceMock = criarProdutosServiceFake({
      list: vi.fn().mockResolvedValue([produto({ id: "produto-destacado" })]),
    });
    const { default: Home } = await import("@/app/page");

    render(<Home />);

    await waitFor(() =>
      expect(recomendacoesServiceMock.obter).toHaveBeenCalledWith({
        usuarioId: "usuario-logado",
      })
    );
  });

  it("nao chama o service de recomendacoes sem contexto real (sem produtos, sem sessao)", async () => {
    produtosServiceMock = criarProdutosServiceFake();
    const { default: Home } = await import("@/app/page");

    render(<Home />);
    await screen.findByText(/nenhum produto dispon/i);

    expect(recomendacoesServiceMock.obter).not.toHaveBeenCalled();
  });

  it("busca controla o termo e consulta o service ao digitar, mostrando loading e resultado", async () => {
    const encontrado = produto({ id: "produto-seed-04", nome: "Jarra Ceramica Esculpida" });
    produtosServiceMock = criarProdutosServiceFake({
      list: vi.fn().mockResolvedValue([]),
      search: vi.fn().mockResolvedValue([encontrado]),
    });
    const { default: Home } = await import("@/app/page");
    const usuario = userEvent.setup();

    render(<Home />);

    const campoBusca = screen.getByRole("searchbox", { name: /buscar produtos/i });
    await usuario.type(campoBusca, "esculpida");

    await waitFor(() =>
      expect(produtosServiceMock.search).toHaveBeenLastCalledWith({ termo: "esculpida" })
    );
    await waitFor(() =>
      expect(screen.getByText("Jarra Ceramica Esculpida")).toBeInTheDocument()
    );
  });

  it("busca ativa esconde o catalogo completo, mostrando somente o resultado da busca", async () => {
    const foraDoResultado = produto({ id: "produto-fora", nome: "Panela de Barro Vidrada" });
    const encontrado = produto({ id: "produto-seed-04", nome: "Jarra Ceramica Esculpida" });
    produtosServiceMock = criarProdutosServiceFake({
      list: vi.fn().mockResolvedValue([foraDoResultado, encontrado]),
      search: vi.fn().mockResolvedValue([encontrado]),
    });
    const { default: Home } = await import("@/app/page");
    const usuario = userEvent.setup();

    render(<Home />);
    await screen.findByText("Panela de Barro Vidrada");

    const campoBusca = screen.getByRole("searchbox", { name: /buscar produtos/i });
    await usuario.type(campoBusca, "esculpida");

    await waitFor(() =>
      expect(screen.getByText("Jarra Ceramica Esculpida")).toBeInTheDocument()
    );
    expect(screen.queryByText("Panela de Barro Vidrada")).not.toBeInTheDocument();
  });

  it("busca mostra erro recuperavel quando o service falha", async () => {
    produtosServiceMock = criarProdutosServiceFake({
      list: vi.fn().mockResolvedValue([]),
      search: vi.fn().mockRejectedValue(new Error("falhou")),
    });
    const { default: Home } = await import("@/app/page");
    const usuario = userEvent.setup();

    render(<Home />);

    const campoBusca = screen.getByRole("searchbox", { name: /buscar produtos/i });
    await usuario.type(campoBusca, "esculpida");

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("inicializa termo e filtros a partir da URL e ja consulta o resultado combinado", async () => {
    searchParamsAtual = new URLSearchParams(
      "termo=vaso&categoria=categoria-ceramica-barro&tecnica=tecnica-modelagem-argila&regiao=regiao-pilar-recife"
    );
    const encontrado = produto({ id: "produto-seed-01", nome: "Vaso de Barro Trancado" });
    produtosServiceMock = criarProdutosServiceFake({
      list: vi.fn().mockResolvedValue([]),
      search: vi.fn().mockResolvedValue([encontrado]),
    });
    const { default: Home } = await import("@/app/page");

    render(<Home />);

    await waitFor(() =>
      expect(produtosServiceMock.search).toHaveBeenCalledWith({
        termo: "vaso",
        categoriaId: "categoria-ceramica-barro",
        tecnicaId: "tecnica-modelagem-argila",
        regiaoId: "regiao-pilar-recife",
      })
    );
    const campoBusca = screen.getByRole("searchbox", { name: /buscar produtos/i });
    expect(campoBusca).toHaveValue("vaso");
  });

  it("selecionar uma categoria atualiza a URL removendo parametros vazios", async () => {
    searchParamsAtual = new URLSearchParams("termo=vaso");
    opcoesFiltroServiceMock = criarOpcoesFiltroServiceFake({
      categorias: vi
        .fn()
        .mockResolvedValue([{ id: "categoria-ceramica-barro", nome: "Ceramica e Barro" }]),
    });
    produtosServiceMock = criarProdutosServiceFake();
    const { default: Home } = await import("@/app/page");
    const usuario = userEvent.setup();

    render(<Home />);

    const selectCategoria = await screen.findByLabelText("Categoria");
    await usuario.selectOptions(selectCategoria, "categoria-ceramica-barro");

    expect(pushMock).toHaveBeenCalledWith(
      "/?termo=vaso&categoria=categoria-ceramica-barro",
      { scroll: false }
    );
  });
});

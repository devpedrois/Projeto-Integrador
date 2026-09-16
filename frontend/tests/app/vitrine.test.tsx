import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { RecomendacoesService } from "@/services/contracts/recomendacoes.contract";
import type { SessionStore } from "@/store/sessao.store";
import type { UsuarioSessao } from "@/types/sessao";
import type { Produto } from "@/types/produto";

let produtosServiceMock: ProdutosService;
let recomendacoesServiceMock: RecomendacoesService;
let sessionStoreMock: SessionStore;

vi.mock("@/services/fake/container", () => ({
  obterProdutosService: () => produtosServiceMock,
  obterRecomendacoesService: () => recomendacoesServiceMock,
  obterSessionStore: () => sessionStoreMock,
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

function criarSessionStoreFake(sessao: UsuarioSessao | null): SessionStore {
  return {
    getSnapshot: vi.fn().mockReturnValue(sessao),
    subscribe: vi.fn().mockReturnValue(() => {}),
  } as unknown as SessionStore;
}

beforeEach(() => {
  sessionStoreMock = criarSessionStoreFake(null);
  recomendacoesServiceMock = {
    obter: vi.fn().mockResolvedValue({ estrategia: "categoria", itens: [] }),
  };
});

describe("Vitrine (Home)", () => {
  it("mostra carregando e depois a lista de produtos", async () => {
    produtosServiceMock = {
      list: vi.fn().mockResolvedValue([produto({ id: "p1", nome: "Vaso de Barro" })]),
    };
    const { default: Home } = await import("@/app/page");

    render(<Home />);

    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByText("Vaso de Barro")).toBeInTheDocument());
  });

  it("mostra estado vazio quando nao ha produtos", async () => {
    produtosServiceMock = { list: vi.fn().mockResolvedValue([]) };
    const { default: Home } = await import("@/app/page");

    render(<Home />);

    expect(await screen.findByText(/nenhum produto dispon/i)).toBeInTheDocument();
  });

  it("mostra erro recuperavel quando o service falha", async () => {
    produtosServiceMock = { list: vi.fn().mockRejectedValue(new Error("falhou")) };
    const { default: Home } = await import("@/app/page");

    render(<Home />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("visitante: usa o produtoId do primeiro produto ativo com estoque como contexto", async () => {
    const destacado = produto({ id: "produto-destacado", ativo: true, quantidadeEstoque: 3 });
    produtosServiceMock = { list: vi.fn().mockResolvedValue([destacado]) };
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
    produtosServiceMock = {
      list: vi.fn().mockResolvedValue([produto({ id: "produto-destacado" })]),
    };
    const { default: Home } = await import("@/app/page");

    render(<Home />);

    await waitFor(() =>
      expect(recomendacoesServiceMock.obter).toHaveBeenCalledWith({
        usuarioId: "usuario-logado",
      })
    );
  });

  it("nao chama o service de recomendacoes sem contexto real (sem produtos, sem sessao)", async () => {
    produtosServiceMock = { list: vi.fn().mockResolvedValue([]) };
    const { default: Home } = await import("@/app/page");

    render(<Home />);
    await screen.findByText(/nenhum produto dispon/i);

    expect(recomendacoesServiceMock.obter).not.toHaveBeenCalled();
  });
});

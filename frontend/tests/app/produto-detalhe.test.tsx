import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartStore } from "@/store/carrinho.store";
import { BrowserCarrinhoStorage } from "@/fake-api/storage/carrinho.storage";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { AvaliacoesService } from "@/services/contracts/avaliacoes.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { RecomendacoesService } from "@/services/contracts/recomendacoes.contract";
import type { SessionStore } from "@/store/sessao.store";
import type { UsuarioSessao } from "@/types/sessao";
import type { Produto } from "@/types/produto";

const PREFIXO_CARRINHO_TESTE = "origem:test:carrinho:produto-detalhe";

let produtosServiceMock: ProdutosService;
let sessionStoreMock: SessionStore;
let carrinhoStore: CartStore;

vi.mock("@/services/fake/container", () => ({
  obterProdutosService: () => produtosServiceMock,
  obterAvaliacoesService: (): AvaliacoesService => ({
    listByProduto: vi.fn().mockResolvedValue([]),
    resumo: vi.fn().mockResolvedValue({ produtoId: "produto-1", media: 5, quantidade: 1 }),
    create: vi.fn(),
  }),
  obterOpcoesFiltroService: (): OpcoesFiltroService => ({
    categorias: vi.fn().mockResolvedValue([]),
    tecnicas: vi.fn().mockResolvedValue([]),
    regioes: vi.fn().mockResolvedValue([]),
  }),
  obterUsuariosService: (): UsuariosService => ({
    list: vi.fn().mockResolvedValue([]),
    register: vi.fn(),
    login: vi.fn(),
  }),
  obterRecomendacoesService: (): RecomendacoesService => ({
    obter: vi.fn().mockResolvedValue({ estrategia: "categoria", itens: [] }),
  }),
  obterSessionStore: () => sessionStoreMock,
  obterCarrinhoStore: () => carrinhoStore,
}));

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "produto-1" }),
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/produto/produto-1",
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
    quantidadeEstoque: 1,
    quantidadeVendida: 0,
    notaMedia: 5,
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
  window.localStorage.removeItem(`${PREFIXO_CARRINHO_TESTE}:u1`);
  carrinhoStore = new CartStore(
    new BrowserCarrinhoStorage(window.localStorage, "u1", PREFIXO_CARRINHO_TESTE)
  );
  produtosServiceMock = {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    listByArtesao: vi.fn().mockResolvedValue([]),
    update: vi.fn(),
    remove: vi.fn(),
    search: vi.fn().mockResolvedValue([]),
    obterPublico: vi.fn().mockResolvedValue(produto()),
  };
  sessionStoreMock = criarSessionStoreFake(null);
  pushMock.mockClear();
});

describe("Pagina de detalhes do produto", () => {
  it("consulta o produto pelo id da rota", async () => {
    const { default: PaginaProduto } = await import("@/app/produto/[id]/page");

    render(<PaginaProduto />);

    expect(await screen.findByRole("heading", { level: 1, name: "Vaso de Barro Trancado" })).toBeInTheDocument();
    expect(produtosServiceMock.obterPublico).toHaveBeenCalledWith("produto-1");
  });

  it("visitante e levado ao login preservando a pagina do produto", async () => {
    const { default: PaginaProduto } = await import("@/app/produto/[id]/page");
    const usuario = userEvent.setup();

    render(<PaginaProduto />);
    await usuario.click(await screen.findByRole("button", { name: /adicionar ao carrinho/i }));

    expect(pushMock).toHaveBeenCalledWith("/login?redirect=%2Fproduto%2Fproduto-1");
    expect(carrinhoStore.getSnapshot().itens).toHaveLength(0);
  });

  it("comprador adiciona ate o limite do estoque e recebe erro acima dele", async () => {
    sessionStoreMock = criarSessionStoreFake({ id: "u1", nome: "Ana", papel: "comprador" });
    const { default: PaginaProduto } = await import("@/app/produto/[id]/page");
    const usuario = userEvent.setup();

    render(<PaginaProduto />);
    const botao = await screen.findByRole("button", { name: /adicionar ao carrinho/i });

    await usuario.click(botao);
    expect(await screen.findByText(/produto adicionado ao carrinho/i)).toBeInTheDocument();
    expect(carrinhoStore.getSnapshot().itens).toEqual([
      expect.objectContaining({ produtoId: "produto-1", quantidade: 1 }),
    ]);

    await usuario.click(botao);
    expect(await screen.findByRole("alert")).toHaveTextContent(/estoque insuficiente/i);
    expect(screen.queryByText(/produto adicionado ao carrinho/i)).not.toBeInTheDocument();
    expect(carrinhoStore.getSnapshot().itens[0]?.quantidade).toBe(1);
  });

  it("produto fora da vitrine publica mostra indisponivel sem botao de compra", async () => {
    produtosServiceMock.obterPublico = vi.fn().mockResolvedValue(null);
    const { default: PaginaProduto } = await import("@/app/produto/[id]/page");

    render(<PaginaProduto />);

    expect(await screen.findByText(/produto indisponivel ou nao encontrado/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /adicionar ao carrinho/i })).not.toBeInTheDocument();
  });
});

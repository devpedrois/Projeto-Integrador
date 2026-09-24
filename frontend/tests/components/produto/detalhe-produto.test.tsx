import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DetalheProduto, type DetalheProdutoProps } from "@/components/produto/DetalheProduto";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { AvaliacoesService } from "@/services/contracts/avaliacoes.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { RecomendacoesService } from "@/services/contracts/recomendacoes.contract";
import type { Produto } from "@/types/produto";

function produto(overrides: Partial<Produto> = {}): Produto {
  return {
    id: "produto-1",
    nome: "Toalha de Renda",
    descricao: "Toalha feita a mao com linha de algodao.",
    preco: 59.9,
    categoriaId: "categoria-1",
    tecnicaId: "tecnica-1",
    regiaoId: "regiao-1",
    artesaoId: "artesao-1",
    fotos: [
      { url: "/produtos/renda-bordado-2.svg", ordem: 1 },
      { url: "/produtos/renda-bordado.svg", ordem: 0 },
    ],
    quantidadeEstoque: 3,
    quantidadeVendida: 0,
    notaMedia: 0,
    ativo: true,
    criadoEm: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function criarProdutosServiceFake(overrides: Partial<ProdutosService> = {}): ProdutosService {
  return {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    listByArtesao: vi.fn().mockResolvedValue([]),
    update: vi.fn(),
    remove: vi.fn(),
    search: vi.fn().mockResolvedValue([]),
    obterPublico: vi.fn().mockResolvedValue(produto()),
    ...overrides,
  };
}

function criarAvaliacoesServiceFake(
  overrides: Partial<AvaliacoesService> = {}
): AvaliacoesService {
  return {
    listByProduto: vi.fn().mockResolvedValue([]),
    resumo: vi
      .fn()
      .mockResolvedValue({ produtoId: "produto-1", media: 4.5, quantidade: 2 }),
    create: vi.fn(),
    ...overrides,
  };
}

function criarOpcoesFiltroServiceFake(): OpcoesFiltroService {
  return {
    categorias: vi.fn().mockResolvedValue([{ id: "categoria-1", nome: "Renda e Bordado" }]),
    tecnicas: vi.fn().mockResolvedValue([{ id: "tecnica-1", nome: "Renda de Bilro" }]),
    regioes: vi.fn().mockResolvedValue([{ id: "regiao-1", nome: "Pilar, Recife" }]),
  };
}

function criarUsuariosServiceFake(): UsuariosService {
  return {
    list: vi.fn().mockResolvedValue([
      { id: "artesao-1", nome: "Maria das Rendas", email: "m@origem.test", papel: "artesao", ativo: true },
    ]),
    register: vi.fn(),
    login: vi.fn(),
  };
}

function criarRecomendacoesServiceFake(): RecomendacoesService {
  return {
    obter: vi.fn().mockResolvedValue({
      estrategia: "categoria",
      itens: [produto({ id: "produto-2", nome: "Caminho de Mesa Bordado" })],
    }),
  };
}

function renderizar(overrides: Partial<DetalheProdutoProps> = {}) {
  const props: DetalheProdutoProps = {
    produtoId: "produto-1",
    produtosService: criarProdutosServiceFake(),
    avaliacoesService: criarAvaliacoesServiceFake(),
    opcoesFiltroService: criarOpcoesFiltroServiceFake(),
    usuariosService: criarUsuariosServiceFake(),
    recomendacoesService: criarRecomendacoesServiceFake(),
    onAdicionarAoCarrinho: vi.fn(),
    ...overrides,
  };
  render(<DetalheProduto {...props} />);
  return props;
}

describe("DetalheProduto", () => {
  it("mostra carregando antes do produto chegar", () => {
    renderizar({ produtosService: criarProdutosServiceFake({ obterPublico: vi.fn(() => new Promise<Produto | null>(() => {})) }) });

    expect(screen.getByRole("status")).toHaveTextContent(/carregando produto/i);
  });

  it("mostra todos os dados do produto no sucesso", async () => {
    renderizar();

    expect(await screen.findByRole("heading", { level: 1, name: "Toalha de Renda" })).toBeInTheDocument();
    expect(screen.getByText("Toalha feita a mao com linha de algodao.")).toBeInTheDocument();
    expect(screen.getByText("R$ 59.90")).toBeInTheDocument();
    expect(screen.getByText(/3 disponiveis/i)).toBeInTheDocument();
    expect(screen.getByText("Renda e Bordado")).toBeInTheDocument();
    expect(screen.getByText("Renda de Bilro")).toBeInTheDocument();
    expect(screen.getByText("Pilar, Recife")).toBeInTheDocument();
  });

  it("mostra as fotos na ordem definida", async () => {
    renderizar();

    await screen.findByRole("heading", { level: 1 });
    const galeria = screen.getByRole("list", { name: /fotos do produto/i });
    const imagens = within(galeria).getAllByRole("img");
    expect(imagens.map((imagem) => imagem.getAttribute("src"))).toEqual([
      "/produtos/renda-bordado.svg",
      "/produtos/renda-bordado-2.svg",
    ]);
  });

  it("descarta fotos com protocolo inseguro", async () => {
    renderizar({
      produtosService: criarProdutosServiceFake({
        obterPublico: vi.fn().mockResolvedValue(
          produto({
            fotos: [
              { url: "javascript:alert(1)", ordem: 0 },
              { url: "//externo.test/foto.jpg", ordem: 1 },
              { url: "https://origem.test/foto.jpg", ordem: 2 },
            ],
          })
        ),
      }),
    });

    await screen.findByRole("heading", { level: 1 });
    const imagens = within(screen.getByRole("list", { name: /fotos do produto/i })).getAllByRole("img");
    expect(imagens.map((imagem) => imagem.getAttribute("src"))).toEqual([
      "https://origem.test/foto.jpg",
    ]);
  });

  it("mostra nota media e quantidade vindas do AvaliacoesService", async () => {
    const props = renderizar();

    expect(await screen.findByText(/nota 4\.5 de 5/i)).toBeInTheDocument();
    expect(screen.getByText(/2 avaliacoes/i)).toBeInTheDocument();
    expect(props.avaliacoesService?.resumo).toHaveBeenCalledWith("produto-1");
  });

  it("indica quando o produto ainda nao tem avaliacoes", async () => {
    renderizar({
      avaliacoesService: criarAvaliacoesServiceFake({
        resumo: vi.fn().mockResolvedValue({ produtoId: "produto-1", media: 0, quantidade: 0 }),
      }),
    });

    expect(await screen.findByText(/sem avaliacoes/i)).toBeInTheDocument();
  });

  it("linka para o perfil publico do artesao", async () => {
    renderizar();

    const link = await screen.findByRole("link", { name: /maria das rendas/i });
    expect(link).toHaveAttribute("href", "/artesao/artesao-1");
  });

  it("usa o produtoId da pagina como contexto das recomendacoes", async () => {
    const props = renderizar();

    expect(await screen.findByText("Caminho de Mesa Bordado")).toBeInTheDocument();
    expect(props.recomendacoesService?.obter).toHaveBeenCalledWith({ produtoId: "produto-1" });
  });

  it("aciona onAdicionarAoCarrinho com o produto carregado", async () => {
    const usuarioTeste = userEvent.setup();
    const props = renderizar();

    await usuarioTeste.click(await screen.findByRole("button", { name: /adicionar ao carrinho/i }));

    expect(props.onAdicionarAoCarrinho).toHaveBeenCalledWith(produto());
  });

  it("mostra erro de carrinho vinculado ao botao", async () => {
    renderizar({ erroCarrinho: 'Estoque insuficiente para "Toalha de Renda".' });

    const botao = await screen.findByRole("button", { name: /adicionar ao carrinho/i });
    const alerta = screen.getByRole("alert");
    expect(alerta).toHaveTextContent(/estoque insuficiente/i);
    expect(botao).toHaveAttribute("aria-describedby", alerta.id);
  });

  it("mostra confirmacao quando o item entra no carrinho", async () => {
    renderizar({ mensagemCarrinho: "Produto adicionado ao carrinho." });

    await screen.findByRole("heading", { level: 1 });
    expect(screen.getByText("Produto adicionado ao carrinho.")).toBeInTheDocument();
  });

  it("produto indisponivel ou inexistente nao pode ser comprado nem gera recomendacoes", async () => {
    const props = renderizar({
      produtosService: criarProdutosServiceFake({ obterPublico: vi.fn().mockResolvedValue(null) }),
    });

    expect(await screen.findByText(/produto indisponivel ou nao encontrado/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /adicionar ao carrinho/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /voltar para a vitrine/i })).toHaveAttribute("href", "/");
    expect(props.recomendacoesService?.obter).not.toHaveBeenCalled();
  });

  it("mostra erro recuperavel e tenta novamente", async () => {
    const usuarioTeste = userEvent.setup();
    const obterPublico = vi
      .fn()
      .mockRejectedValueOnce(new Error("falha simulada"))
      .mockResolvedValue(produto());
    renderizar({ produtosService: criarProdutosServiceFake({ obterPublico }) });

    expect(await screen.findByRole("alert")).toHaveTextContent(/nao foi possivel carregar este produto/i);
    expect(screen.queryByRole("button", { name: /adicionar ao carrinho/i })).not.toBeInTheDocument();

    await usuarioTeste.click(screen.getByRole("button", { name: /tentar novamente/i }));

    expect(await screen.findByRole("heading", { level: 1, name: "Toalha de Renda" })).toBeInTheDocument();
  });
});

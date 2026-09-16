import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResultadoBusca } from "@/components/vitrine/ResultadoBusca";
import { CATEGORIA_IDS } from "@/fake-api/seeds/categorias.seed";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { Produto } from "@/types/produto";

function produto(overrides: Partial<Produto> = {}): Produto {
  return {
    id: "produto-1",
    nome: "Jarra Ceramica Esculpida",
    descricao: "Jarra utilitaria com relevos entalhados a mao no torno.",
    preco: 89.9,
    categoriaId: CATEGORIA_IDS.ceramicaBarro,
    tecnicaId: "",
    regiaoId: "",
    artesaoId: "artesao-1",
    fotos: [{ url: "https://origem.test/fotos/jarra.jpg", ordem: 0 }],
    quantidadeEstoque: 5,
    quantidadeVendida: 0,
    notaMedia: 0,
    ativo: true,
    criadoEm: new Date().toISOString(),
    ...overrides,
  };
}

function criarServicoFake(
  overrides: Partial<ProdutosService> = {}
): ProdutosService {
  return {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue(produto()),
    listByArtesao: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(produto()),
    remove: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("ResultadoBusca - estado vazio", () => {
  it("mostra estado vazio acessivel e distinto de erro quando a busca nao encontra produtos", async () => {
    const service = criarServicoFake({ search: vi.fn().mockResolvedValue([]) });

    render(<ResultadoBusca service={service} query={{ termo: "zzz-inexistente" }} onLimpar={vi.fn()} />);

    const vazio = await screen.findByRole("status", { name: /nenhum resultado/i });
    expect(vazio).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("nao mostra estado vazio durante o carregamento", () => {
    const service = criarServicoFake({
      search: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    render(<ResultadoBusca service={service} query={{ termo: "zzz" }} onLimpar={vi.fn()} />);

    expect(screen.queryByRole("status", { name: /nenhum resultado/i })).not.toBeInTheDocument();
  });

  it("oferece botao para limpar filtros no estado vazio e o aciona ao clicar", async () => {
    const service = criarServicoFake({ search: vi.fn().mockResolvedValue([]) });
    const onLimpar = vi.fn();
    const usuario = userEvent.setup();

    render(<ResultadoBusca service={service} query={{ termo: "zzz-inexistente" }} onLimpar={onLimpar} />);

    const botao = await screen.findByRole("button", { name: /limpar filtros/i });
    await usuario.click(botao);

    expect(onLimpar).toHaveBeenCalledTimes(1);
  });

  it.each([
    "zzz-termo-um",
    "zzz-termo-dois",
    "zzz-termo-tres",
    "zzz-termo-quatro",
    "zzz-termo-cinco",
  ])("mostra estado vazio para a busca sem correspondencia '%s'", async (termo) => {
    const service = criarServicoFake({ search: vi.fn().mockResolvedValue([]) });

    render(<ResultadoBusca service={service} query={{ termo }} onLimpar={vi.fn()} />);

    expect(await screen.findByRole("status", { name: /nenhum resultado/i })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

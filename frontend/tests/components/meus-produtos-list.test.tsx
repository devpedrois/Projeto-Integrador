import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MeusProdutosList } from "@/components/painel-artesao/MeusProdutosList";
import { ServiceError } from "@/services/errors";
import { CATEGORIA_IDS } from "@/fake-api/seeds/categorias.seed";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { Produto } from "@/types/produto";

const ARTESAO_ID_SESSAO = "artesao-sessao-1";

function produto(overrides: Partial<Produto> = {}): Produto {
  return {
    id: "produto-1",
    nome: "Vaso de Barro",
    descricao: "Vaso modelado a mao com argila da regiao.",
    preco: 89.9,
    categoriaId: CATEGORIA_IDS.ceramicaBarro,
    tecnicaId: "",
    regiaoId: "",
    artesaoId: ARTESAO_ID_SESSAO,
    fotos: [{ url: "https://origem.test/fotos/vaso.jpg", ordem: 0 }],
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
    listByArtesao: vi.fn().mockResolvedValue([produto()]),
    update: vi.fn().mockResolvedValue(produto()),
    remove: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue([]),
    obterPublico: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe("MeusProdutosList", () => {
  it("mostra estado de carregamento inicialmente", () => {
    const service = criarServicoFake({
      listByArtesao: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    render(<MeusProdutosList service={service} artesaoId={ARTESAO_ID_SESSAO} />);

    expect(screen.getByRole("status")).toHaveTextContent(/carregando/i);
  });

  it("mostra estado vazio quando o artesao nao possui produtos", async () => {
    const service = criarServicoFake({
      listByArtesao: vi.fn().mockResolvedValue([]),
    });

    render(<MeusProdutosList service={service} artesaoId={ARTESAO_ID_SESSAO} />);

    expect(await screen.findByText(/nenhum produto/i)).toBeInTheDocument();
  });

  it("mostra estado de erro quando a listagem falha", async () => {
    const service = criarServicoFake({
      listByArtesao: vi.fn().mockRejectedValue(new Error("falhou")),
    });

    render(<MeusProdutosList service={service} artesaoId={ARTESAO_ID_SESSAO} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /nao foi possivel/i
    );
  });

  it("lista somente produtos do artesao da sessao, isolando duas contas diferentes", async () => {
    const listByArtesaoA = vi
      .fn()
      .mockResolvedValue([produto({ id: "p1", nome: "Produto da Conta A", artesaoId: "artesao-a" })]);
    const servicoA = criarServicoFake({ listByArtesao: listByArtesaoA });

    const { unmount } = render(
      <MeusProdutosList service={servicoA} artesaoId="artesao-a" />
    );
    expect(await screen.findByText("Produto da Conta A")).toBeInTheDocument();
    expect(listByArtesaoA).toHaveBeenCalledWith("artesao-a");
    unmount();

    const listByArtesaoB = vi
      .fn()
      .mockResolvedValue([produto({ id: "p2", nome: "Produto da Conta B", artesaoId: "artesao-b" })]);
    const servicoB = criarServicoFake({ listByArtesao: listByArtesaoB });

    render(<MeusProdutosList service={servicoB} artesaoId="artesao-b" />);
    expect(await screen.findByText("Produto da Conta B")).toBeInTheDocument();
    expect(screen.queryByText("Produto da Conta A")).not.toBeInTheDocument();
    expect(listByArtesaoB).toHaveBeenCalledWith("artesao-b");
  });

  it("editar produto chama service.update com o artesaoId da sessao e atualiza a lista", async () => {
    const user = userEvent.setup();
    const produtoOriginal = produto({ nome: "Vaso de Barro" });
    const produtoAtualizado = produto({ nome: "Vaso de Barro Editado" });
    const listByArtesao = vi
      .fn()
      .mockResolvedValueOnce([produtoOriginal])
      .mockResolvedValueOnce([produtoAtualizado]);
    const update = vi.fn().mockResolvedValue(produtoAtualizado);
    const service = criarServicoFake({ listByArtesao, update });

    render(<MeusProdutosList service={service} artesaoId={ARTESAO_ID_SESSAO} />);
    const item = await screen.findByRole("listitem", { name: /vaso de barro/i });

    await user.click(within(item).getByRole("button", { name: /editar/i }));
    const campoNome = within(item).getByLabelText(/nome/i);
    await user.clear(campoNome);
    await user.type(campoNome, "Vaso de Barro Editado");
    await user.click(within(item).getByRole("button", { name: /salvar/i }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    const [idChamado, entradaChamada, artesaoIdChamado] = update.mock.calls[0] as [
      string,
      unknown,
      string,
    ];
    expect(idChamado).toBe(produtoOriginal.id);
    expect(artesaoIdChamado).toBe(ARTESAO_ID_SESSAO);
    expect(entradaChamada).not.toHaveProperty("artesaoId");

    expect(await screen.findByText("Vaso de Barro Editado")).toBeInTheDocument();
  });

  it("sinaliza produto desativado pela moderacao", async () => {
    const service = criarServicoFake({
      listByArtesao: vi.fn().mockResolvedValue([produto({ desativadoPorAdmin: true })]),
    });

    render(<MeusProdutosList service={service} artesaoId={ARTESAO_ID_SESSAO} />);

    const item = await screen.findByRole("listitem", { name: "Vaso de Barro" });
    expect(item).toHaveTextContent(/desativado pela moderacao/i);
  });

  it("remover exige confirmacao antes de chamar o service", async () => {
    const user = userEvent.setup();
    const remove = vi.fn().mockResolvedValue(undefined);
    const service = criarServicoFake({ remove });

    render(<MeusProdutosList service={service} artesaoId={ARTESAO_ID_SESSAO} />);
    const item = await screen.findByRole("listitem", { name: /vaso de barro/i });

    await user.click(within(item).getByRole("button", { name: /remover/i }));

    expect(remove).not.toHaveBeenCalled();
    expect(
      within(item).getByRole("button", { name: /confirmar remocao/i })
    ).toBeInTheDocument();
  });

  it("confirmar remocao chama service.remove e o produto some da lista", async () => {
    const user = userEvent.setup();
    const produtoAlvo = produto();
    const listByArtesao = vi
      .fn()
      .mockResolvedValueOnce([produtoAlvo])
      .mockResolvedValueOnce([]);
    const remove = vi.fn().mockResolvedValue(undefined);
    const service = criarServicoFake({ listByArtesao, remove });

    render(<MeusProdutosList service={service} artesaoId={ARTESAO_ID_SESSAO} />);
    const item = await screen.findByRole("listitem", { name: /vaso de barro/i });

    await user.click(within(item).getByRole("button", { name: /remover/i }));
    await user.click(
      within(item).getByRole("button", { name: /confirmar remocao/i })
    );

    await waitFor(() =>
      expect(remove).toHaveBeenCalledWith(produtoAlvo.id, ARTESAO_ID_SESSAO)
    );
    expect(await screen.findByText(/nenhum produto/i)).toBeInTheDocument();
  });

  it("cancelar remocao mantem o produto na lista sem chamar o service", async () => {
    const user = userEvent.setup();
    const remove = vi.fn().mockResolvedValue(undefined);
    const service = criarServicoFake({ remove });

    render(<MeusProdutosList service={service} artesaoId={ARTESAO_ID_SESSAO} />);
    const item = await screen.findByRole("listitem", { name: /vaso de barro/i });

    await user.click(within(item).getByRole("button", { name: /remover/i }));
    await user.click(within(item).getByRole("button", { name: /cancelar/i }));

    expect(remove).not.toHaveBeenCalled();
    expect(screen.getByText("Vaso de Barro")).toBeInTheDocument();
  });

  it("mostra erro recuperavel quando a remocao e rejeitada (ex.: produto de outra conta)", async () => {
    const user = userEvent.setup();
    const remove = vi
      .fn()
      .mockRejectedValue(
        new ServiceError("ACESSO_NEGADO", "Produto nao encontrado para este artesao.")
      );
    const service = criarServicoFake({ remove });

    render(<MeusProdutosList service={service} artesaoId={ARTESAO_ID_SESSAO} />);
    const item = await screen.findByRole("listitem", { name: /vaso de barro/i });

    await user.click(within(item).getByRole("button", { name: /remover/i }));
    await user.click(
      within(item).getByRole("button", { name: /confirmar remocao/i })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /nao foi possivel/i
    );
    expect(screen.getByText("Vaso de Barro")).toBeInTheDocument();
  });
});

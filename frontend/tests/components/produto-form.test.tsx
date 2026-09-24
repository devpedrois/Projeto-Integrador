import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProdutoForm } from "@/components/painel-artesao/ProdutoForm";
import { ServiceError } from "@/services/errors";
import { CATEGORIA_IDS } from "@/fake-api/seeds/categorias.seed";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { Produto } from "@/types/produto";

const ARTESAO_ID_SESSAO = "artesao-sessao-1";

function produtoCriado(overrides: Partial<Produto> = {}): Produto {
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
  createImpl?: ProdutosService["create"]
): ProdutosService {
  return {
    list: vi.fn().mockResolvedValue([]),
    create: createImpl ?? vi.fn().mockResolvedValue(produtoCriado()),
    listByArtesao: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(produtoCriado()),
    remove: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue([]),
    obterPublico: vi.fn().mockResolvedValue(null),
  };
}

async function preencherFormularioValido(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/nome/i), "Vaso de Barro");
  await user.type(
    screen.getByLabelText(/descricao/i),
    "Vaso modelado a mao com argila da regiao."
  );
  await user.type(screen.getByLabelText(/preco/i), "89.90");
  await user.selectOptions(
    screen.getByLabelText(/categoria/i),
    CATEGORIA_IDS.ceramicaBarro
  );
  await user.type(
    screen.getByLabelText(/foto/i),
    "https://origem.test/fotos/vaso.jpg"
  );
  await user.type(screen.getByLabelText(/estoque/i), "5");
}

describe("ProdutoForm", () => {
  it("possui labels associadas a cada campo", () => {
    render(
      <ProdutoForm service={criarServicoFake()} artesaoId={ARTESAO_ID_SESSAO} />
    );

    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descricao/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/preco/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/categoria/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/foto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/estoque/i)).toBeInTheDocument();
  });

  it("campos ausentes bloqueiam criacao e mostram erros por campo", async () => {
    const user = userEvent.setup();
    const createSpy = vi.fn();
    render(
      <ProdutoForm
        service={criarServicoFake(createSpy)}
        artesaoId={ARTESAO_ID_SESSAO}
      />
    );

    await user.click(screen.getByRole("button", { name: /cadastrar produto/i }));

    expect(await screen.findByText(/nome com ao menos/i)).toBeInTheDocument();
    expect(screen.getByText(/descricao com ao menos/i)).toBeInTheDocument();
    expect(screen.getByText(/preco maior que zero/i)).toBeInTheDocument();
    expect(screen.getByText(/categoria valida/i)).toBeInTheDocument();
    expect(screen.getByText(/ao menos uma foto/i)).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it.each([
    ["0", "0"],
    ["-1", "-1"],
    ["-0.5", "-0.5"],
    ["-100", "-100"],
    ["-0.01", "-0.01"],
  ])("preco %s bloqueia criacao", async (_rotulo, valorDigitado) => {
    const user = userEvent.setup();
    const createSpy = vi.fn();
    render(
      <ProdutoForm
        service={criarServicoFake(createSpy)}
        artesaoId={ARTESAO_ID_SESSAO}
      />
    );

    await preencherFormularioValido(user);
    await user.clear(screen.getByLabelText(/preco/i));
    await user.type(screen.getByLabelText(/preco/i), valorDigitado);
    await user.click(screen.getByRole("button", { name: /cadastrar produto/i }));

    expect(await screen.findByText(/preco maior que zero/i)).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("produto valido chama o service vinculado ao artesao da sessao e mostra confirmacao", async () => {
    const user = userEvent.setup();
    const createSpy = vi.fn().mockResolvedValue(produtoCriado());
    render(
      <ProdutoForm
        service={criarServicoFake(createSpy)}
        artesaoId={ARTESAO_ID_SESSAO}
      />
    );

    await preencherFormularioValido(user);
    await user.click(screen.getByRole("button", { name: /cadastrar produto/i }));

    await waitFor(() => expect(createSpy).toHaveBeenCalledTimes(1));
    const [entrada, artesaoId] = createSpy.mock.calls[0] as [unknown, string];
    expect(artesaoId).toBe(ARTESAO_ID_SESSAO);
    expect(entrada).not.toHaveProperty("artesaoId");
    expect(await screen.findByRole("status")).toHaveTextContent(/cadastrado/i);
  });

  it("mostra loading e desabilita o botao durante o envio", async () => {
    const user = userEvent.setup();
    let resolver: (produto: Produto) => void = () => {};
    const pendente = new Promise<Produto>((resolve) => {
      resolver = resolve;
    });
    const createSpy = vi.fn().mockReturnValue(pendente);
    render(
      <ProdutoForm
        service={criarServicoFake(createSpy)}
        artesaoId={ARTESAO_ID_SESSAO}
      />
    );

    await preencherFormularioValido(user);
    const botao = screen.getByRole("button", { name: /cadastrar produto/i });
    await user.click(botao);

    expect(botao).toBeDisabled();
    expect(screen.getByText(/enviando/i)).toBeInTheDocument();

    resolver(produtoCriado());
    await waitFor(() => expect(botao).not.toBeDisabled());
  });

  it("nao envia duas vezes ao clicar repetidamente antes da resposta", async () => {
    const user = userEvent.setup();
    let resolver: (produto: Produto) => void = () => {};
    const pendente = new Promise<Produto>((resolve) => {
      resolver = resolve;
    });
    const createSpy = vi.fn().mockReturnValue(pendente);
    render(
      <ProdutoForm
        service={criarServicoFake(createSpy)}
        artesaoId={ARTESAO_ID_SESSAO}
      />
    );

    await preencherFormularioValido(user);
    const botao = screen.getByRole("button", { name: /cadastrar produto/i });
    await user.click(botao);
    await user.click(botao);
    await user.click(botao);

    resolver(produtoCriado());
    await waitFor(() => expect(createSpy).toHaveBeenCalledTimes(1));
  });

  it("mostra erro recuperavel quando o service falha e permite tentar novamente", async () => {
    const user = userEvent.setup();
    const createSpy = vi
      .fn()
      .mockRejectedValue(
        new ServiceError("PRODUTO_INDISPONIVEL", "Falha ao cadastrar produto.")
      );
    render(
      <ProdutoForm
        service={criarServicoFake(createSpy)}
        artesaoId={ARTESAO_ID_SESSAO}
      />
    );

    await preencherFormularioValido(user);
    await user.click(screen.getByRole("button", { name: /cadastrar produto/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /nao foi possivel cadastrar/i
    );
    const botao = screen.getByRole("button", { name: /cadastrar produto/i });
    expect(botao).not.toBeDisabled();
  });
});

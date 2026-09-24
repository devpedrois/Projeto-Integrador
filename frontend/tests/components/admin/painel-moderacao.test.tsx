import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PainelModeracao } from "@/components/admin/PainelModeracao";
import { ServiceError } from "@/services/errors";
import type { ModeracaoService } from "@/services/contracts/moderacao.contract";
import type { Produto } from "@/types/produto";
import type { UsuarioPublico } from "@/types/usuario";

const ADMIN_ID = "seed-admin-01";

function artesao(overrides: Partial<UsuarioPublico> = {}): UsuarioPublico {
  return {
    id: "artesao-1",
    nome: "Joao Artesao",
    email: "joao.artesao@origem.test",
    papel: "artesao",
    ativo: true,
    ...overrides,
  };
}

function produto(overrides: Partial<Produto> = {}): Produto {
  return {
    id: "produto-1",
    nome: "Vaso de Barro",
    descricao: "Vaso modelado a mao.",
    preco: 89.9,
    categoriaId: "categoria-1",
    tecnicaId: "",
    regiaoId: "",
    artesaoId: "artesao-1",
    fotos: [],
    quantidadeEstoque: 5,
    quantidadeVendida: 0,
    notaMedia: 0,
    ativo: true,
    criadoEm: new Date().toISOString(),
    ...overrides,
  };
}

function criarServico(overrides: Partial<ModeracaoService> = {}): ModeracaoService {
  return {
    listarArtesaos: vi.fn().mockResolvedValue([artesao()]),
    listarProdutos: vi.fn().mockResolvedValue([produto()]),
    ativarArtesao: vi.fn().mockResolvedValue(artesao()),
    desativarArtesao: vi.fn().mockResolvedValue(artesao({ ativo: false })),
    ativarProduto: vi.fn().mockResolvedValue(produto()),
    desativarProduto: vi.fn().mockResolvedValue(produto({ ativo: false })),
    ...overrides,
  };
}

describe("PainelModeracao", () => {
  it("mostra carregamento enquanto as listagens nao chegam", () => {
    const service = criarServico({
      listarArtesaos: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    render(<PainelModeracao service={service} adminId={ADMIN_ID} />);

    expect(screen.getByRole("status")).toHaveTextContent(/carregando/i);
  });

  it("mostra erro recuperavel e tenta novamente", async () => {
    const listarArtesaos = vi
      .fn()
      .mockRejectedValueOnce(new ServiceError("ACESSO_NEGADO", "negado"))
      .mockResolvedValue([artesao()]);
    const service = criarServico({ listarArtesaos });

    render(<PainelModeracao service={service} adminId={ADMIN_ID} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/nao foi possivel/i);
    await userEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(await screen.findByRole("region", { name: /artesaos/i })).toBeInTheDocument();
  });

  it("mostra estado vazio em cada listagem", async () => {
    const service = criarServico({
      listarArtesaos: vi.fn().mockResolvedValue([]),
      listarProdutos: vi.fn().mockResolvedValue([]),
    });

    render(<PainelModeracao service={service} adminId={ADMIN_ID} />);

    expect(await screen.findByText(/nenhum artesao cadastrado/i)).toBeInTheDocument();
    expect(screen.getByText(/nenhum produto cadastrado/i)).toBeInTheDocument();
  });

  it("lista artesaos e produtos com status visivel e sem senha", async () => {
    const service = criarServico({
      listarArtesaos: vi.fn().mockResolvedValue([
        artesao(),
        { ...artesao({ id: "artesao-2", nome: "Maria Artesa", ativo: false }), senha: "vazada" },
      ]),
      listarProdutos: vi.fn().mockResolvedValue([
        produto(),
        produto({ id: "produto-2", nome: "Renda Renascenca", desativadoPorAdmin: true }),
      ]),
    });

    render(<PainelModeracao service={service} adminId={ADMIN_ID} />);

    const artesaos = await screen.findByRole("region", { name: /artesaos/i });
    const produtos = screen.getByRole("region", { name: /produtos/i });
    expect(within(artesaos).getByRole("listitem", { name: "Joao Artesao" })).toHaveTextContent(
      /ativo/i
    );
    expect(within(artesaos).getByRole("listitem", { name: "Maria Artesa" })).toHaveTextContent(
      /inativo/i
    );
    expect(within(produtos).getByRole("listitem", { name: "Renda Renascenca" })).toHaveTextContent(
      /inativo/i
    );
    expect(document.body).not.toHaveTextContent(/vazada|senha/i);
  });

  it("pede confirmacao antes de desativar e nao age ao cancelar", async () => {
    const service = criarServico();
    render(<PainelModeracao service={service} adminId={ADMIN_ID} />);
    const item = await screen.findByRole("listitem", { name: "Joao Artesao" });

    await userEvent.click(within(item).getByRole("button", { name: /desativar/i }));
    await userEvent.click(within(item).getByRole("button", { name: /cancelar/i }));

    expect(service.desativarArtesao).not.toHaveBeenCalled();
  });

  it("desativa artesao apos confirmar e mostra sucesso", async () => {
    const listarArtesaos = vi
      .fn()
      .mockResolvedValueOnce([artesao()])
      .mockResolvedValue([artesao({ ativo: false })]);
    const service = criarServico({ listarArtesaos });
    render(<PainelModeracao service={service} adminId={ADMIN_ID} />);
    const item = await screen.findByRole("listitem", { name: "Joao Artesao" });

    await userEvent.click(within(item).getByRole("button", { name: /desativar/i }));
    await userEvent.click(within(item).getByRole("button", { name: /confirmar/i }));

    expect(service.desativarArtesao).toHaveBeenCalledWith("artesao-1", ADMIN_ID);
    expect(await screen.findByText(/joao artesao foi desativado/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("listitem", { name: "Joao Artesao" })).toHaveTextContent(/inativo/i)
    );
  });

  it("reativa produto apos confirmar", async () => {
    const service = criarServico({
      listarProdutos: vi.fn().mockResolvedValue([produto({ desativadoPorAdmin: true })]),
    });
    render(<PainelModeracao service={service} adminId={ADMIN_ID} />);
    const item = await screen.findByRole("listitem", { name: "Vaso de Barro" });

    await userEvent.click(within(item).getByRole("button", { name: /ativar/i }));
    await userEvent.click(within(item).getByRole("button", { name: /confirmar/i }));

    expect(service.ativarProduto).toHaveBeenCalledWith("produto-1", ADMIN_ID);
    expect(await screen.findByText(/vaso de barro foi reativado/i)).toBeInTheDocument();
  });

  it("sinaliza produto removido pelo artesao", async () => {
    const service = criarServico({
      listarProdutos: vi.fn().mockResolvedValue([produto({ ativo: false })]),
    });

    render(<PainelModeracao service={service} adminId={ADMIN_ID} />);

    const item = await screen.findByRole("listitem", { name: "Vaso de Barro" });
    expect(item).toHaveTextContent(/removido pelo artesao/i);
  });

  it("mostra erro quando a acao falha", async () => {
    const service = criarServico({
      desativarProduto: vi
        .fn()
        .mockRejectedValue(new ServiceError("ACESSO_NEGADO", "negado")),
    });
    render(<PainelModeracao service={service} adminId={ADMIN_ID} />);
    const item = await screen.findByRole("listitem", { name: "Vaso de Barro" });

    await userEvent.click(within(item).getByRole("button", { name: /desativar/i }));
    await userEvent.click(within(item).getByRole("button", { name: /confirmar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/nao foi possivel concluir/i);
  });
});

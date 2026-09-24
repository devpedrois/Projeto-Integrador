import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useDetalheProduto } from "@/hooks/use-detalhe-produto";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { AvaliacoesService } from "@/services/contracts/avaliacoes.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";
import type { Produto } from "@/types/produto";

function produto(overrides: Partial<Produto> = {}): Produto {
  return {
    id: "produto-1",
    nome: "Toalha de Renda",
    descricao: "Toalha feita a mao.",
    preco: 59.9,
    categoriaId: "categoria-1",
    tecnicaId: "tecnica-1",
    regiaoId: "regiao-1",
    artesaoId: "artesao-1",
    fotos: [{ url: "/produtos/renda-bordado.svg", ordem: 0 }],
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

interface Servicos {
  produtosService: ProdutosService;
  avaliacoesService: AvaliacoesService;
  opcoesFiltroService: OpcoesFiltroService;
}

function renderizar(produtoId: string | null, overrides: Partial<Servicos> = {}) {
  const servicos: Servicos = {
    produtosService: overrides.produtosService ?? criarProdutosServiceFake(),
    avaliacoesService: overrides.avaliacoesService ?? criarAvaliacoesServiceFake(),
    opcoesFiltroService: overrides.opcoesFiltroService ?? criarOpcoesFiltroServiceFake(),
  };

  const hook = renderHook(() =>
    useDetalheProduto(
      servicos.produtosService,
      servicos.avaliacoesService,
      servicos.opcoesFiltroService,
      produtoId
    )
  );

  return { ...hook, ...servicos };
}

describe("useDetalheProduto", () => {
  it("comeca carregando enquanto os services nao existem", () => {
    const { result } = renderHook(() => useDetalheProduto(null, null, null, "produto-1"));

    expect(result.current.estado.status).toBe("carregando");
  });

  it("retorna produto, nomes de categoria/tecnica/regiao e resumo das avaliacoes", async () => {
    const { result, avaliacoesService } = renderizar("produto-1");

    await waitFor(() => expect(result.current.estado.status).toBe("sucesso"));
    expect(avaliacoesService.resumo).toHaveBeenCalledWith("produto-1");
    expect(result.current.estado).toMatchObject({
      produto: { id: "produto-1" },
      categoriaNome: "Renda e Bordado",
      tecnicaNome: "Renda de Bilro",
      regiaoNome: "Pilar, Recife",
      resumo: { media: 4.5, quantidade: 2 },
    });
  });

  it("marca indisponivel quando o service nao retorna produto publico", async () => {
    const { result } = renderizar("produto-inexistente", {
      produtosService: criarProdutosServiceFake({ obterPublico: vi.fn().mockResolvedValue(null) }),
    });

    await waitFor(() => expect(result.current.estado.status).toBe("indisponivel"));
  });

  it("marca indisponivel sem consultar o service quando o id esta ausente", async () => {
    const { result, produtosService } = renderizar(null);

    await waitFor(() => expect(result.current.estado.status).toBe("indisponivel"));
    expect(produtosService.obterPublico).not.toHaveBeenCalled();
  });

  it("mostra erro recuperavel e recarrega com sucesso", async () => {
    const obterPublico = vi
      .fn()
      .mockRejectedValueOnce(new Error("falha simulada"))
      .mockResolvedValue(produto());
    const { result } = renderizar("produto-1", {
      produtosService: criarProdutosServiceFake({ obterPublico }),
    });

    await waitFor(() => expect(result.current.estado.status).toBe("erro"));

    act(() => result.current.recarregar());

    await waitFor(() => expect(result.current.estado.status).toBe("sucesso"));
    expect(obterPublico).toHaveBeenCalledTimes(2);
  });

  it("falha no resumo de avaliacoes tambem vira erro recuperavel", async () => {
    const { result } = renderizar("produto-1", {
      avaliacoesService: criarAvaliacoesServiceFake({
        resumo: vi.fn().mockRejectedValue(new Error("falha simulada")),
      }),
    });

    await waitFor(() => expect(result.current.estado.status).toBe("erro"));
  });
});

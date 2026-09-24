import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useMeusProdutos } from "@/hooks/use-meus-produtos";
import { CATEGORIA_IDS } from "@/fake-api/seeds/categorias.seed";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { Produto } from "@/types/produto";

function produto(overrides: Partial<Produto> = {}): Produto {
  return {
    id: "produto-1",
    nome: "Vaso de Barro",
    descricao: "Vaso modelado a mao com argila da regiao.",
    preco: 89.9,
    categoriaId: CATEGORIA_IDS.ceramicaBarro,
    tecnicaId: "",
    regiaoId: "",
    artesaoId: "artesao-1",
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

describe("useMeusProdutos", () => {
  it("inicia em carregando quando service e artesaoId estao disponiveis", () => {
    const service = criarServicoFake({
      listByArtesao: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    const { result } = renderHook(() => useMeusProdutos(service, "artesao-1"));

    expect(result.current.estado.status).toBe("carregando");
  });

  it("retorna sucesso com os produtos do artesao", async () => {
    const produtos = [produto({ id: "p1" }), produto({ id: "p2" })];
    const service = criarServicoFake({
      listByArtesao: vi.fn().mockResolvedValue(produtos),
    });

    const { result } = renderHook(() => useMeusProdutos(service, "artesao-1"));

    await waitFor(() =>
      expect(result.current.estado.status).toBe("sucesso")
    );
    expect(service.listByArtesao).toHaveBeenCalledWith("artesao-1");
    if (result.current.estado.status === "sucesso") {
      expect(result.current.estado.produtos).toHaveLength(2);
    }
  });

  it("retorna vazio quando o artesao nao possui produtos", async () => {
    const service = criarServicoFake({
      listByArtesao: vi.fn().mockResolvedValue([]),
    });

    const { result } = renderHook(() => useMeusProdutos(service, "artesao-1"));

    await waitFor(() => expect(result.current.estado.status).toBe("vazio"));
  });

  it("retorna erro quando o service falha", async () => {
    const service = criarServicoFake({
      listByArtesao: vi.fn().mockRejectedValue(new Error("falhou")),
    });

    const { result } = renderHook(() => useMeusProdutos(service, "artesao-1"));

    await waitFor(() => expect(result.current.estado.status).toBe("erro"));
  });

  it("recarregar busca a lista novamente", async () => {
    const listByArtesao = vi
      .fn()
      .mockResolvedValueOnce([produto({ id: "p1" })])
      .mockResolvedValueOnce([produto({ id: "p1" }), produto({ id: "p2" })]);
    const service = criarServicoFake({ listByArtesao });

    const { result } = renderHook(() => useMeusProdutos(service, "artesao-1"));

    await waitFor(() => expect(result.current.estado.status).toBe("sucesso"));

    act(() => {
      result.current.recarregar();
    });

    await waitFor(() => {
      if (result.current.estado.status !== "sucesso") throw new Error("aguardando");
      expect(result.current.estado.produtos).toHaveLength(2);
    });
    expect(listByArtesao).toHaveBeenCalledTimes(2);
  });

  it("nao chama o service quando artesaoId e nulo", () => {
    const service = criarServicoFake();

    renderHook(() => useMeusProdutos(service, null));

    expect(service.listByArtesao).not.toHaveBeenCalled();
  });
});

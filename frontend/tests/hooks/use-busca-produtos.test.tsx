import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useBuscaProdutos } from "@/hooks/use-busca-produtos";
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

describe("useBuscaProdutos", () => {
  it("inicia em carregando quando o service esta disponivel", () => {
    const service = criarServicoFake({
      search: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    const { result } = renderHook(() =>
      useBuscaProdutos(service, { termo: "esculpid" })
    );

    expect(result.current.status).toBe("carregando");
  });

  it("retorna sucesso com os produtos encontrados pela consulta", async () => {
    const produtos = [produto({ id: "produto-seed-04" }), produto({ id: "produto-seed-14" })];
    const service = criarServicoFake({
      search: vi.fn().mockResolvedValue(produtos),
    });

    const { result } = renderHook(() =>
      useBuscaProdutos(service, { termo: "esculpid" })
    );

    await waitFor(() => expect(result.current.status).toBe("sucesso"));
    expect(service.search).toHaveBeenCalledWith({ termo: "esculpid" });
    if (result.current.status === "sucesso") {
      expect(result.current.produtos).toHaveLength(2);
    }
  });

  it("envia tecnica, regiao e categoria juntos na mesma consulta", async () => {
    const service = criarServicoFake({
      search: vi.fn().mockResolvedValue([]),
    });
    const query = {
      termo: "renda",
      categoriaId: "categoria-renda-bordado",
      tecnicaId: "tecnica-renda-irlandesa",
      regiaoId: "regiao-pilar-recife",
    };

    renderHook(() => useBuscaProdutos(service, query));

    await waitFor(() => expect(service.search).toHaveBeenCalledWith(query));
  });

  it("retorna vazio quando a consulta nao encontra produtos", async () => {
    const service = criarServicoFake({
      search: vi.fn().mockResolvedValue([]),
    });

    const { result } = renderHook(() =>
      useBuscaProdutos(service, { termo: "inexistente" })
    );

    await waitFor(() => expect(result.current.status).toBe("vazio"));
  });

  it("retorna erro quando o service falha", async () => {
    const service = criarServicoFake({
      search: vi.fn().mockRejectedValue(new Error("falhou")),
    });

    const { result } = renderHook(() =>
      useBuscaProdutos(service, { termo: "esculpid" })
    );

    await waitFor(() => expect(result.current.status).toBe("erro"));
  });

  it("refaz a busca quando a consulta muda", async () => {
    const search = vi
      .fn()
      .mockResolvedValueOnce([produto({ id: "produto-seed-04" })])
      .mockResolvedValueOnce([produto({ id: "produto-seed-07" })]);
    const service = criarServicoFake({ search });

    const { result, rerender } = renderHook(
      ({ query }) => useBuscaProdutos(service, query),
      { initialProps: { query: { termo: "esculpid" } } }
    );

    await waitFor(() => expect(result.current.status).toBe("sucesso"));

    rerender({ query: { termo: "irlandesa" } });

    await waitFor(() => {
      if (result.current.status !== "sucesso") throw new Error("aguardando");
      expect(result.current.produtos[0]?.id).toBe("produto-seed-07");
    });
    expect(search).toHaveBeenCalledTimes(2);
    expect(search).toHaveBeenNthCalledWith(2, { termo: "irlandesa" });
  });
});

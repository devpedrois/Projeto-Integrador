import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useRecomendacoes } from "@/hooks/use-recomendacoes";
import type { RecomendacoesService } from "@/services/contracts/recomendacoes.contract";
import type { RecomendacaoResultado } from "@/types/recomendacao";
import type { Produto } from "@/types/produto";

function produto(id: string): Produto {
  return {
    id,
    nome: `Produto ${id}`,
    descricao: "Descricao de teste.",
    preco: 10,
    categoriaId: "categoria-1",
    tecnicaId: "tecnica-1",
    regiaoId: "regiao-1",
    artesaoId: "artesao-1",
    fotos: [{ url: "/produtos/fixture.svg", ordem: 0 }],
    quantidadeEstoque: 5,
    quantidadeVendida: 1,
    notaMedia: 4,
    ativo: true,
    criadoEm: "2026-08-01T00:00:00.000Z",
  };
}

function criarServicoFake(obterImpl: RecomendacoesService["obter"]): RecomendacoesService {
  return { obter: obterImpl };
}

describe("useRecomendacoes", () => {
  it("permanece em carregando quando nao ha service ou contexto", () => {
    const { result } = renderHook(() => useRecomendacoes(null, null));

    expect(result.current).toEqual({ status: "carregando" });
  });

  it("retorna sucesso quando o service resolve com itens", async () => {
    const resultado: RecomendacaoResultado = {
      estrategia: "categoria",
      itens: [produto("p1"), produto("p2")],
    };
    const service = criarServicoFake(vi.fn().mockResolvedValue(resultado));

    const { result } = renderHook(() =>
      useRecomendacoes(service, { produtoId: "contexto-1" })
    );

    expect(result.current).toEqual({ status: "carregando" });

    await waitFor(() =>
      expect(result.current).toEqual({ status: "sucesso", resultado })
    );
  });

  it("retorna vazio quando o service resolve sem itens", async () => {
    const resultado: RecomendacaoResultado = { estrategia: "categoria", itens: [] };
    const service = criarServicoFake(vi.fn().mockResolvedValue(resultado));

    const { result } = renderHook(() =>
      useRecomendacoes(service, { produtoId: "contexto-1" })
    );

    await waitFor(() => expect(result.current).toEqual({ status: "vazio" }));
  });

  it("retorna erro recuperavel quando o service rejeita", async () => {
    const service = criarServicoFake(vi.fn().mockRejectedValue(new Error("falhou")));

    const { result } = renderHook(() =>
      useRecomendacoes(service, { produtoId: "contexto-1" })
    );

    await waitFor(() => expect(result.current.status).toBe("erro"));
  });

  it("nunca invoca o service sem contexto real", () => {
    const obter = vi.fn();
    const service = criarServicoFake(obter);

    renderHook(() => useRecomendacoes(service, null));

    expect(obter).not.toHaveBeenCalled();
  });

  it("chama o service com o contexto informado", async () => {
    const obter = vi.fn().mockResolvedValue({ estrategia: "categoria", itens: [] });
    const service = criarServicoFake(obter);

    renderHook(() => useRecomendacoes(service, { produtoId: "produto-destacado" }));

    await waitFor(() =>
      expect(obter).toHaveBeenCalledWith({ produtoId: "produto-destacado" })
    );
  });
});

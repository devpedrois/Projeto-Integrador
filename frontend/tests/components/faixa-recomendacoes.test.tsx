import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FaixaRecomendacoes } from "@/components/vitrine/FaixaRecomendacoes";
import type { RecomendacoesService } from "@/services/contracts/recomendacoes.contract";
import type { Produto } from "@/types/produto";

function produto(id: string, nome: string): Produto {
  return {
    id,
    nome,
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

describe("FaixaRecomendacoes", () => {
  it("mostra estado de carregando antes do service resolver", () => {
    const service = criarServicoFake(() => new Promise(() => {}));

    render(<FaixaRecomendacoes service={service} contexto={{ produtoId: "p1" }} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("mostra os produtos recomendados apos sucesso", async () => {
    const service = criarServicoFake(
      vi.fn().mockResolvedValue({
        estrategia: "categoria",
        itens: [produto("p1", "Vaso de Barro"), produto("p2", "Colar em Sementes")],
      })
    );

    render(<FaixaRecomendacoes service={service} contexto={{ produtoId: "contexto" }} />);

    await waitFor(() => expect(screen.getByText("Vaso de Barro")).toBeInTheDocument());
    expect(screen.getByText("Colar em Sementes")).toBeInTheDocument();
  });

  it("mostra estado vazio quando nao ha recomendacoes", async () => {
    const service = criarServicoFake(
      vi.fn().mockResolvedValue({ estrategia: "categoria", itens: [] })
    );

    render(<FaixaRecomendacoes service={service} contexto={{ produtoId: "contexto" }} />);

    await waitFor(() =>
      expect(screen.getByText(/nenhuma recomendacao/i)).toBeInTheDocument()
    );
  });

  it("mostra erro recuperavel quando o service falha", async () => {
    const service = criarServicoFake(vi.fn().mockRejectedValue(new Error("falhou")));

    render(<FaixaRecomendacoes service={service} contexto={{ produtoId: "contexto" }} />);

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  it("nao renderiza produtos quando nao ha contexto real ainda", () => {
    const obter = vi.fn();
    const service = criarServicoFake(obter);

    render(<FaixaRecomendacoes service={service} contexto={null} />);

    expect(obter).not.toHaveBeenCalled();
  });
});

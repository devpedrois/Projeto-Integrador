import { beforeEach, describe, expect, it } from "vitest";
import { FakeRecommendationAdapter } from "@/services/fake/recomendacoes/fake-recommendation.adapter";
import { BrowserProdutoRepository } from "@/fake-api/repositories/produto.repository";
import type { ProdutoRepository } from "@/fake-api/repositories/produto.repository";
import type { Produto } from "@/types/produto";
import fixture from "../../../fixtures/recomendacao-produto.fixture.json";

const CHAVE_TESTE = "origem:test:produtos:recomendacoes:v1";

class ProdutoRepositoryEmMemoria implements ProdutoRepository {
  constructor(private readonly produtos: Produto[]) {}

  async seed(): Promise<void> {
    // Fixture ja fornece a massa completa; nada a semear.
  }

  async list(): Promise<Produto[]> {
    return this.produtos;
  }
}

const PRODUTOS_FIXTURE = fixture.produtos as Produto[];

beforeEach(() => {
  window.localStorage.removeItem(CHAVE_TESTE);
});

describe("FakeRecommendationAdapter - fixture contratual por produto", () => {
  it("reproduz o ranking esperado documentado na fixture", async () => {
    const repositorio = new ProdutoRepositoryEmMemoria(PRODUTOS_FIXTURE);
    const adapter = new FakeRecommendationAdapter(repositorio);

    const resultado = await adapter.obter({
      produtoId: fixture.contexto.produtoId,
    });

    expect(resultado.estrategia).toBe(fixture.resultadoEsperado.estrategia);
    expect(resultado.itens.map((item) => item.id)).toEqual(
      fixture.resultadoEsperado.produtoIds
    );
  });

  it("nunca retorna mais itens que o limite documentado", async () => {
    const repositorio = new ProdutoRepositoryEmMemoria(PRODUTOS_FIXTURE);
    const adapter = new FakeRecommendationAdapter(repositorio);

    const resultado = await adapter.obter({
      produtoId: fixture.contexto.produtoId,
    });

    expect(resultado.itens.length).toBeLessThanOrEqual(fixture.limiteItens);
  });

  it("nunca inclui o produto de contexto no resultado", async () => {
    const repositorio = new ProdutoRepositoryEmMemoria(PRODUTOS_FIXTURE);
    const adapter = new FakeRecommendationAdapter(repositorio);

    const resultado = await adapter.obter({
      produtoId: fixture.contexto.produtoId,
    });

    expect(resultado.itens.some((item) => item.id === fixture.contexto.produtoId)).toBe(
      false
    );
  });

  it("nunca inclui produto de outra categoria, inativo ou sem estoque", async () => {
    const repositorio = new ProdutoRepositoryEmMemoria(PRODUTOS_FIXTURE);
    const adapter = new FakeRecommendationAdapter(repositorio);

    const resultado = await adapter.obter({
      produtoId: fixture.contexto.produtoId,
    });
    const idsRetornados = resultado.itens.map((item) => item.id);

    expect(idsRetornados).not.toContain("produto-fixture-outra-categoria");
    expect(idsRetornados).not.toContain("produto-fixture-inativo");
    expect(idsRetornados).not.toContain("produto-fixture-sem-estoque");
  });
});

describe("FakeRecommendationAdapter - fallback geral", () => {
  it("usa fallback geral quando o contexto e usuarioId", async () => {
    const repositorio = new ProdutoRepositoryEmMemoria(PRODUTOS_FIXTURE);
    const adapter = new FakeRecommendationAdapter(repositorio);

    const resultado = await adapter.obter({ usuarioId: "usuario-qualquer" });

    expect(resultado.estrategia).toBe("fallback-geral");
    expect(resultado.itens.length).toBeGreaterThan(0);
    expect(resultado.itens.length).toBeLessThanOrEqual(8);
  });

  it("usa fallback geral quando o produtoId de contexto nao existe", async () => {
    const repositorio = new ProdutoRepositoryEmMemoria(PRODUTOS_FIXTURE);
    const adapter = new FakeRecommendationAdapter(repositorio);

    const resultado = await adapter.obter({ produtoId: "produto-inexistente" });

    expect(resultado.estrategia).toBe("fallback-geral");
  });

  it("usa fallback geral quando a categoria do contexto nao tem candidatos elegiveis", async () => {
    const produtos: Produto[] = [
      {
        id: "contexto-isolado",
        nome: "Contexto Isolado",
        descricao: "Produto sem nenhum outro concorrente na categoria.",
        preco: 10,
        categoriaId: "categoria-isolada",
        tecnicaId: "tecnica-fixture",
        regiaoId: "regiao-fixture-1",
        artesaoId: "artesao-fixture",
        fotos: [{ url: "/produtos/fixture.svg", ordem: 0 }],
        quantidadeEstoque: 5,
        quantidadeVendida: 1,
        notaMedia: 3,
        ativo: true,
        criadoEm: "2026-08-01T00:00:00.000Z",
      },
      {
        id: "produto-fallback-01",
        nome: "Produto Fallback",
        descricao: "Unico candidato disponivel, pertence a outra categoria.",
        preco: 10,
        categoriaId: "categoria-diferente",
        tecnicaId: "tecnica-fixture",
        regiaoId: "regiao-fixture-1",
        artesaoId: "artesao-fixture",
        fotos: [{ url: "/produtos/fixture.svg", ordem: 0 }],
        quantidadeEstoque: 5,
        quantidadeVendida: 10,
        notaMedia: 4,
        ativo: true,
        criadoEm: "2026-08-02T00:00:00.000Z",
      },
    ];
    const repositorio = new ProdutoRepositoryEmMemoria(produtos);
    const adapter = new FakeRecommendationAdapter(repositorio);

    const resultado = await adapter.obter({ produtoId: "contexto-isolado" });

    expect(resultado.estrategia).toBe("fallback-geral");
    expect(resultado.itens.map((item) => item.id)).toEqual(["produto-fallback-01"]);
  });
});

describe("FakeRecommendationAdapter - repositorio real do navegador", () => {
  it("usa o repositorio local real e persiste apos nova instancia", async () => {
    const repositorio = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const adapter = new FakeRecommendationAdapter(repositorio);
    await repositorio.seed();
    const produtos = await repositorio.list();
    const contexto = produtos.find((produto) => produto.ativo && produto.quantidadeEstoque > 0);
    if (!contexto) throw new Error("massa de teste sem produto elegivel");

    const resultado = await adapter.obter({ produtoId: contexto.id });

    expect(resultado.itens.length).toBeLessThanOrEqual(8);
    expect(resultado.itens.every((item) => item.id !== contexto.id)).toBe(true);
  });
});

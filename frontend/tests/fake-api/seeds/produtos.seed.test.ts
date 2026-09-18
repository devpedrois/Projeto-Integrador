import { describe, expect, it } from "vitest";
import { PRODUTOS_SEED } from "@/fake-api/seeds/produtos.seed";
import { CATEGORIA_IDS } from "@/fake-api/seeds/categorias.seed";

describe("PRODUTOS_SEED", () => {
  it("gera exatamente trinta produtos", () => {
    expect(PRODUTOS_SEED).toHaveLength(30);
  });

  it("possui ids unicos", () => {
    const ids = PRODUTOS_SEED.map((produto) => produto.id);
    expect(new Set(ids).size).toBe(30);
  });

  it("distribui produtos por cinco categorias, deixando a sexta vazia", () => {
    const categoriasComProduto = new Set(
      PRODUTOS_SEED.map((produto) => produto.categoriaId)
    );

    expect(categoriasComProduto.size).toBe(5);
    expect(categoriasComProduto.has(CATEGORIA_IDS.arteReciclada)).toBe(false);
  });

  it("distribui produtos entre pelo menos dois artesaos sinteticos", () => {
    const artesaos = new Set(PRODUTOS_SEED.map((produto) => produto.artesaoId));
    expect(artesaos.size).toBeGreaterThanOrEqual(2);
  });

  it("varia o estoque entre os produtos", () => {
    const estoques = new Set(PRODUTOS_SEED.map((produto) => produto.quantidadeEstoque));
    expect(estoques.size).toBeGreaterThan(1);
  });

  it("todo produto possui ao menos uma foto e textos preenchidos", () => {
    for (const produto of PRODUTOS_SEED) {
      expect(produto.fotos.length).toBeGreaterThan(0);
      expect(produto.nome.trim().length).toBeGreaterThan(0);
      expect(produto.descricao.trim().length).toBeGreaterThan(0);
      expect(produto.preco).toBeGreaterThan(0);
    }
  });

  it("e deterministico entre execucoes do modulo", async () => {
    const outraImportacao = await import("@/fake-api/seeds/produtos.seed");
    expect(outraImportacao.PRODUTOS_SEED).toEqual(PRODUTOS_SEED);
  });
});

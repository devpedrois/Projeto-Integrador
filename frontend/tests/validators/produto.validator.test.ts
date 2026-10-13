import { describe, expect, it } from "vitest";
import { CATEGORIA_IDS } from "@/fake-api/seeds/categorias.seed";
import type { NovoProdutoInput } from "@/types/novo-produto";
import {
  produtoValido,
  validarProduto,
} from "@/validators/produto.validator";

function entradaValida(
  overrides: Partial<NovoProdutoInput> = {}
): NovoProdutoInput {
  return {
    nome: "Vaso de Barro",
    descricao: "Vaso modelado a mao com argila da regiao.",
    preco: 89.9,
    categoriaId: CATEGORIA_IDS.ceramicaBarro,
    fotos: [{ url: "https://origem.test/fotos/vaso.jpg" }],
    quantidadeEstoque: 5,
    ...overrides,
  };
}

describe("validarProduto", () => {
  it("entrada valida nao produz erros", () => {
    const erros = validarProduto(entradaValida());

    expect(produtoValido(erros)).toBe(true);
  });

  it("nome ausente bloqueia criacao", () => {
    const erros = validarProduto(entradaValida({ nome: "" }));

    expect(erros.nome).toBeDefined();
    expect(produtoValido(erros)).toBe(false);
  });

  it("descricao ausente bloqueia criacao", () => {
    const erros = validarProduto(entradaValida({ descricao: "" }));

    expect(erros.descricao).toBeDefined();
    expect(produtoValido(erros)).toBe(false);
  });

  it("categoria ausente bloqueia criacao", () => {
    const erros = validarProduto(entradaValida({ categoriaId: "" }));

    expect(erros.categoriaId).toBeDefined();
    expect(produtoValido(erros)).toBe(false);
  });

  it("categoria desconhecida bloqueia criacao", () => {
    const erros = validarProduto(
      entradaValida({ categoriaId: "categoria-inexistente" })
    );

    expect(erros.categoriaId).toBeDefined();
    expect(produtoValido(erros)).toBe(false);
  });

  it("nenhuma foto bloqueia criacao", () => {
    const erros = validarProduto(entradaValida({ fotos: [] }));

    expect(erros.fotos).toBeDefined();
    expect(produtoValido(erros)).toBe(false);
  });

  it("foto com url vazia bloqueia criacao", () => {
    const erros = validarProduto(entradaValida({ fotos: [{ url: "  " }] }));

    expect(erros.fotos).toBeDefined();
    expect(produtoValido(erros)).toBe(false);
  });

  it("estoque ausente bloqueia criacao", () => {
    const erros = validarProduto(
      entradaValida({ quantidadeEstoque: Number.NaN })
    );

    expect(erros.quantidadeEstoque).toBeDefined();
    expect(produtoValido(erros)).toBe(false);
  });

  it.each([0, -1, -0.5, -100, Number.NaN])(
    "preco %p bloqueia criacao",
    (preco) => {
      const erros = validarProduto(entradaValida({ preco }));

      expect(erros.preco).toBeDefined();
      expect(produtoValido(erros)).toBe(false);
    }
  );

  it("estoque fracionario bloqueia criacao", () => {
    const erros = validarProduto(entradaValida({ quantidadeEstoque: 1.5 }));

    expect(erros.quantidadeEstoque).toBeDefined();
    expect(produtoValido(erros)).toBe(false);
  });

  it("estoque negativo bloqueia criacao", () => {
    const erros = validarProduto(entradaValida({ quantidadeEstoque: -1 }));

    expect(erros.quantidadeEstoque).toBeDefined();
    expect(produtoValido(erros)).toBe(false);
  });

  it("estoque zero e permitido", () => {
    const erros = validarProduto(entradaValida({ quantidadeEstoque: 0 }));

    expect(erros.quantidadeEstoque).toBeUndefined();
  });

  it.each(["https://origem.test/fotos/vaso.jpg", "/fotos/vaso.jpg"])(
    "aceita foto %s",
    (url) => {
      const erros = validarProduto(entradaValida({ fotos: [{ url }] }));

      expect(erros.fotos).toBeUndefined();
    }
  );

  it.each([
    "http://origem.test/foto.jpg",
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "//evil.com/foto.jpg",
    "/%5Cevil.com/foto.jpg",
    "ftp://origem.test/foto.jpg",
    "foto.jpg",
  ])("rejeita foto %s", (url) => {
    const erros = validarProduto(entradaValida({ fotos: [{ url }] }));

    expect(erros.fotos).toBeDefined();
  });

  it("rejeita foto com barra invertida", () => {
    const erros = validarProduto(entradaValida({ fotos: [{ url: "/\\evil.com/foto.jpg" }] }));

    expect(erros.fotos).toBeDefined();
  });

  it("rejeita quando qualquer uma das fotos e insegura", () => {
    const erros = validarProduto(
      entradaValida({ fotos: [{ url: "/fotos/vaso.jpg" }, { url: "javascript:alert(1)" }] })
    );

    expect(erros.fotos).toBeDefined();
  });
});

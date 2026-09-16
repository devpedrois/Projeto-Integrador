import { describe, expect, it } from "vitest";
import {
  filtrarProdutosVisiveis,
  produtoVisivelPublicamente,
} from "@/domain/produto-visibilidade";
import type { Produto } from "@/types/produto";

function produto(overrides: Partial<Produto> = {}): Produto {
  return {
    id: "produto-1",
    nome: "Vaso de Barro",
    descricao: "Vaso modelado a mao.",
    preco: 50,
    categoriaId: "categoria-1",
    tecnicaId: "tecnica-1",
    regiaoId: "regiao-1",
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

describe("produtoVisivelPublicamente", () => {
  it("produto ativo com estoque e visivel", () => {
    expect(produtoVisivelPublicamente(produto())).toBe(true);
  });

  it("produto com estoque zero nao e visivel", () => {
    expect(produtoVisivelPublicamente(produto({ quantidadeEstoque: 0 }))).toBe(false);
  });

  it("produto inativo nao e visivel mesmo com estoque", () => {
    expect(produtoVisivelPublicamente(produto({ ativo: false }))).toBe(false);
  });
});

describe("filtrarProdutosVisiveis - contexto visitante", () => {
  it("remove produtos com estoque zero", () => {
    const produtos = [produto({ id: "a" }), produto({ id: "b", quantidadeEstoque: 0 })];

    const resultado = filtrarProdutosVisiveis(produtos);

    expect(resultado.map((p) => p.id)).toEqual(["a"]);
  });

  it("remove produtos inativos", () => {
    const produtos = [produto({ id: "a" }), produto({ id: "b", ativo: false })];

    const resultado = filtrarProdutosVisiveis(produtos);

    expect(resultado.map((p) => p.id)).toEqual(["a"]);
  });

  it("visitante autenticado como outro usuario nao ve produto zerado de terceiros", () => {
    const produtos = [produto({ id: "a", artesaoId: "artesao-1", quantidadeEstoque: 0 })];

    const resultado = filtrarProdutosVisiveis(produtos, { usuarioId: "comprador-x" });

    expect(resultado).toEqual([]);
  });
});

describe("filtrarProdutosVisiveis - contexto dono", () => {
  it("dono ve o proprio produto mesmo com estoque zero", () => {
    const produtos = [produto({ id: "a", artesaoId: "artesao-1", quantidadeEstoque: 0 })];

    const resultado = filtrarProdutosVisiveis(produtos, { usuarioId: "artesao-1" });

    expect(resultado.map((p) => p.id)).toEqual(["a"]);
  });

  it("dono nao ve produto de outro artesao mesmo sendo dono de outros produtos", () => {
    const produtos = [
      produto({ id: "a", artesaoId: "artesao-2", quantidadeEstoque: 0 }),
    ];

    const resultado = filtrarProdutosVisiveis(produtos, { usuarioId: "artesao-1" });

    expect(resultado).toEqual([]);
  });

  it("perfil publico do artesao aplica a mesma politica para visitante", () => {
    const produtos = [
      produto({ id: "a", artesaoId: "artesao-1" }),
      produto({ id: "b", artesaoId: "artesao-1", quantidadeEstoque: 0 }),
      produto({ id: "c", artesaoId: "artesao-1", ativo: false }),
    ];

    const resultado = filtrarProdutosVisiveis(produtos);

    expect(resultado.map((p) => p.id)).toEqual(["a"]);
  });
});

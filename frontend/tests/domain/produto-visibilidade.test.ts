import { describe, expect, it } from "vitest";
import {
  filtrarProdutosVisiveis,
  idsArtesaosInativos,
  produtoDisponivelParaVenda,
  produtoVisivelPublicamente,
} from "@/domain/produto-visibilidade";
import type { Produto } from "@/types/produto";
import type { Usuario } from "@/types/usuario";

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

describe("visibilidade com artesao desativado", () => {
  const inativos = new Set(["artesao-1"]);

  it("produto de artesao desativado nao aparece publicamente", () => {
    expect(produtoVisivelPublicamente(produto(), inativos)).toBe(false);
  });

  it("produto de artesao ativo continua visivel", () => {
    expect(produtoVisivelPublicamente(produto({ artesaoId: "artesao-2" }), inativos)).toBe(
      true
    );
  });

  it("visitante nao ve produtos de artesao desativado", () => {
    const produtos = [
      produto({ id: "a", artesaoId: "artesao-1" }),
      produto({ id: "b", artesaoId: "artesao-2" }),
    ];

    const resultado = filtrarProdutosVisiveis(produtos, { artesaosInativos: inativos });

    expect(resultado.map((p) => p.id)).toEqual(["b"]);
  });

  it("dono continua vendo os proprios produtos ativos", () => {
    const produtos = [
      produto({ id: "a", artesaoId: "artesao-1" }),
      produto({ id: "b", artesaoId: "artesao-1", ativo: false }),
    ];

    const resultado = filtrarProdutosVisiveis(produtos, {
      usuarioId: "artesao-1",
      artesaosInativos: inativos,
    });

    expect(resultado.map((p) => p.id)).toEqual(["a"]);
  });
});

describe("idsArtesaosInativos", () => {
  function usuario(overrides: Partial<Usuario>): Usuario {
    return {
      id: "u",
      nome: "Usuario",
      email: "u@origem.test",
      senha: "senha-sintetica",
      papel: "artesao",
      ativo: true,
      ...overrides,
    };
  }

  it("retorna somente artesaos desativados", () => {
    const ids = idsArtesaosInativos([
      usuario({ id: "a1", ativo: false }),
      usuario({ id: "a2", ativo: true }),
      usuario({ id: "c1", papel: "comprador", ativo: false }),
    ]);

    expect([...ids]).toEqual(["a1"]);
  });
});

describe("produto desativado pela moderacao", () => {
  it("nao aparece publicamente", () => {
    expect(produtoVisivelPublicamente(produto({ desativadoPorAdmin: true }))).toBe(false);
  });

  it("continua no painel do dono", () => {
    const produtos = [produto({ id: "a", desativadoPorAdmin: true })];

    const resultado = filtrarProdutosVisiveis(produtos, { usuarioId: "artesao-1" });

    expect(resultado.map((p) => p.id)).toEqual(["a"]);
  });
});

describe("produtoDisponivelParaVenda", () => {
  it("aceita produto ativo de artesao ativo mesmo sem estoque", () => {
    expect(produtoDisponivelParaVenda(produto({ quantidadeEstoque: 0 }))).toBe(true);
  });

  it("rejeita produto removido pelo dono", () => {
    expect(produtoDisponivelParaVenda(produto({ ativo: false }))).toBe(false);
  });

  it("rejeita produto desativado pela moderacao", () => {
    expect(produtoDisponivelParaVenda(produto({ desativadoPorAdmin: true }))).toBe(false);
  });

  it("rejeita produto de artesao desativado", () => {
    expect(produtoDisponivelParaVenda(produto(), new Set(["artesao-1"]))).toBe(false);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { BrowserCarrinhoStorage } from "@/fake-api/storage/carrinho.storage";
import { CartStore } from "@/store/carrinho.store";
import type { Produto } from "@/types/produto";

const PREFIXO_TESTE = "origem:test:carrinho:store:v1";
const USUARIO_TESTE = "usuario-teste";

function produto(id: string, preco: number): Produto {
  return {
    id,
    nome: `Produto ${id}`,
    descricao: "descricao",
    preco,
    categoriaId: "cat-1",
    tecnicaId: "tec-1",
    regiaoId: "reg-1",
    artesaoId: "artesao-1",
    fotos: [],
    quantidadeEstoque: 10,
    quantidadeVendida: 0,
    notaMedia: 0,
    ativo: true,
    criadoEm: new Date().toISOString(),
  };
}

function criarStore(): CartStore {
  return new CartStore(
    new BrowserCarrinhoStorage(window.localStorage, USUARIO_TESTE, PREFIXO_TESTE)
  );
}

beforeEach(() => {
  window.localStorage.removeItem(`${PREFIXO_TESTE}:${USUARIO_TESTE}`);
});

describe("CartStore", () => {
  it("adiciona um produto novo ao carrinho", () => {
    const store = criarStore();

    store.adicionar(produto("p1", 10), 2);

    expect(store.getSnapshot().itens).toEqual([
      { produtoId: "p1", nome: "Produto p1", precoUnitario: 10, quantidade: 2 },
    ]);
  });

  it("adicionar novamente o mesmo produto soma a quantidade", () => {
    const store = criarStore();

    store.adicionar(produto("p1", 10), 2);
    store.adicionar(produto("p1", 10), 3);

    expect(store.getSnapshot().itens).toHaveLength(1);
    expect(store.getSnapshot().itens.at(0)?.quantidade).toBe(5);
  });

  it("remove um item do carrinho", () => {
    const store = criarStore();
    store.adicionar(produto("p1", 10), 2);
    store.adicionar(produto("p2", 20), 1);

    store.remover("p1");

    expect(store.getSnapshot().itens.map((item) => item.produtoId)).toEqual(["p2"]);
  });

  it("altera a quantidade de um item existente", () => {
    const store = criarStore();
    store.adicionar(produto("p1", 10), 2);

    store.alterarQuantidade("p1", 5);

    expect(store.getSnapshot().itens.at(0)?.quantidade).toBe(5);
  });

  it("remove o item ao alterar a quantidade para zero", () => {
    const store = criarStore();
    store.adicionar(produto("p1", 10), 2);

    store.alterarQuantidade("p1", 0);

    expect(store.getSnapshot().itens).toEqual([]);
  });

  it("recalcula o total apos cada mudanca", () => {
    const store = criarStore();

    store.adicionar(produto("p1", 10), 2);
    expect(store.getSnapshot().total).toBe(20);

    store.adicionar(produto("p2", 5), 4);
    expect(store.getSnapshot().total).toBe(40);

    store.alterarQuantidade("p1", 1);
    expect(store.getSnapshot().total).toBe(30);

    store.remover("p2");
    expect(store.getSnapshot().total).toBe(10);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { BrowserCarrinhoStorage } from "@/fake-api/storage/carrinho.storage";
import { CartStore } from "@/store/carrinho.store";
import { ServiceError } from "@/services/errors";
import type { Produto } from "@/types/produto";

const PREFIXO_TESTE = "origem:test:carrinho:store:v1";
const USUARIO_TESTE = "usuario-teste";

function produto(id: string, preco: number, quantidadeEstoque = 10): Produto {
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
    quantidadeEstoque,
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
      {
        produtoId: "p1",
        nome: "Produto p1",
        precoUnitario: 10,
        quantidade: 2,
        estoqueDisponivel: 10,
      },
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

  it("limpar esvazia o carrinho e persiste o estado vazio", () => {
    const store = criarStore();
    store.adicionar(produto("p1", 10), 2);

    store.limpar();

    expect(store.getSnapshot().itens).toEqual([]);
    expect(store.getSnapshot().total).toBe(0);

    const novaInstancia = criarStore();
    expect(novaInstancia.getSnapshot().itens).toEqual([]);
  });

  describe("validacao de estoque", () => {
    it("aceita adicionar quantidade igual ao estoque disponivel", () => {
      const store = criarStore();

      store.adicionar(produto("p1", 10, 5), 5);

      expect(store.getSnapshot().itens.at(0)?.quantidade).toBe(5);
    });

    it("aceita adicionar quantidade um a menos que o estoque disponivel", () => {
      const store = criarStore();

      store.adicionar(produto("p1", 10, 5), 4);

      expect(store.getSnapshot().itens.at(0)?.quantidade).toBe(4);
    });

    it("bloqueia adicionar quando o estoque disponivel e zero", () => {
      const store = criarStore();

      expect(() => store.adicionar(produto("p1", 10, 0), 1)).toThrow(ServiceError);
      expect(store.getSnapshot().itens).toEqual([]);
    });

    it("bloqueia adicionar quantidade acima do estoque disponivel", () => {
      const store = criarStore();

      expect(() => store.adicionar(produto("p1", 10, 5), 6)).toThrow(ServiceError);
      expect(store.getSnapshot().itens).toEqual([]);
    });

    it("bloqueia adicionar novamente um produto ja presente quando a soma ultrapassa o estoque", () => {
      const store = criarStore();
      store.adicionar(produto("p1", 10, 5), 3);

      expect(() => store.adicionar(produto("p1", 10, 5), 3)).toThrow(ServiceError);
      expect(store.getSnapshot().itens.at(0)?.quantidade).toBe(3);
    });

    it("aceita adicionar novamente um produto ja presente somando ao existente dentro do estoque", () => {
      const store = criarStore();
      store.adicionar(produto("p1", 10, 5), 2);

      store.adicionar(produto("p1", 10, 5), 3);

      expect(store.getSnapshot().itens.at(0)?.quantidade).toBe(5);
    });

    it("usa o codigo de erro ESTOQUE_INSUFICIENTE ao bloquear a adicao", () => {
      const store = criarStore();

      try {
        store.adicionar(produto("p1", 10, 2), 3);
        expect.unreachable("deveria ter lancado ServiceError");
      } catch (excecao) {
        expect(excecao).toBeInstanceOf(ServiceError);
        expect((excecao as ServiceError).code).toBe("ESTOQUE_INSUFICIENTE");
      }
    });

    it("bloqueia alterarQuantidade acima do estoque registrado no item", () => {
      const store = criarStore();
      store.adicionar(produto("p1", 10, 5), 2);

      expect(() => store.alterarQuantidade("p1", 6)).toThrow(ServiceError);
      expect(store.getSnapshot().itens.at(0)?.quantidade).toBe(2);
    });

    it("aceita alterarQuantidade ate o limite do estoque registrado no item", () => {
      const store = criarStore();
      store.adicionar(produto("p1", 10, 5), 2);

      store.alterarQuantidade("p1", 5);

      expect(store.getSnapshot().itens.at(0)?.quantidade).toBe(5);
    });

    it("nao altera o storage quando a operacao e bloqueada", () => {
      const store = criarStore();
      store.adicionar(produto("p1", 10, 5), 2);

      expect(() => store.adicionar(produto("p1", 10, 5), 10)).toThrow(ServiceError);

      const novaInstancia = criarStore();
      expect(novaInstancia.getSnapshot().itens.at(0)?.quantidade).toBe(2);
    });
  });
});

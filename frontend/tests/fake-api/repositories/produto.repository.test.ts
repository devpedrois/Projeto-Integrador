import { beforeEach, describe, expect, it } from "vitest";
import { BrowserProdutoRepository } from "@/fake-api/repositories/produto.repository";

const CHAVE_TESTE = "origem:test:produtos:repository:v1";

beforeEach(() => {
  window.localStorage.removeItem(CHAVE_TESTE);
});

describe("BrowserProdutoRepository", () => {
  it("seed popula exatamente trinta produtos na primeira execucao", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);

    await repo.seed();
    const produtos = await repo.list();

    expect(produtos).toHaveLength(30);
  });

  it("seed e idempotente e nao sobrescreve alteracoes existentes", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();
    const produtos = await repo.list();
    const primeiro = produtos[0];
    if (!primeiro) throw new Error("seed deveria conter ao menos um produto");
    const alterado = { ...primeiro, nome: "Nome Alterado Manualmente" };
    window.localStorage.setItem(
      CHAVE_TESTE,
      JSON.stringify([alterado, ...produtos.slice(1)])
    );

    await repo.seed();
    const produtosDepois = await repo.list();
    const primeiroDepois = produtosDepois[0];

    expect(primeiroDepois?.nome).toBe("Nome Alterado Manualmente");
    expect(produtosDepois).toHaveLength(30);
  });

  it("dados sobrevivem a uma nova instancia apontando para a mesma chave", async () => {
    const primeiraInstancia = new BrowserProdutoRepository(
      window.localStorage,
      CHAVE_TESTE
    );
    await primeiraInstancia.seed();

    const segundaInstancia = new BrowserProdutoRepository(
      window.localStorage,
      CHAVE_TESTE
    );
    const produtos = await segundaInstancia.list();

    expect(produtos).toHaveLength(30);
  });

  it("list retorna array vazio quando nada foi semeado", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);

    const produtos = await repo.list();

    expect(produtos).toEqual([]);
  });
});

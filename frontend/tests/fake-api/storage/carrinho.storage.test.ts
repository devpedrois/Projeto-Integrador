import { beforeEach, describe, expect, it } from "vitest";
import { BrowserCarrinhoStorage } from "@/fake-api/storage/carrinho.storage";
import type { Carrinho } from "@/types/carrinho";

const PREFIXO_TESTE = "origem:test:carrinho:storage:v1";
const USUARIO_TESTE = "u1";
const CHAVE_TESTE = `${PREFIXO_TESTE}:${USUARIO_TESTE}`;

beforeEach(() => {
  window.localStorage.removeItem(CHAVE_TESTE);
});

function criarStorage(): BrowserCarrinhoStorage {
  return new BrowserCarrinhoStorage(window.localStorage, USUARIO_TESTE, PREFIXO_TESTE);
}

describe("BrowserCarrinhoStorage", () => {
  it("retorna null quando nao ha carrinho salvo", () => {
    expect(criarStorage().ler()).toBeNull();
  });

  it("persiste e le o carrinho salvo", () => {
    const carrinho: Carrinho = { itens: [], total: 0, atualizadoEm: "2026-10-13T00:00:00.000Z" };
    const storage = criarStorage();

    storage.salvar(carrinho);

    expect(storage.ler()).toEqual(carrinho);
  });

  it.each(["{json-invalido", '"texto"', "null", '{"itens":"nao-lista"}', "[]"])(
    "descarta valor corrompido %s",
    (bruto) => {
      window.localStorage.setItem(CHAVE_TESTE, bruto);

      expect(criarStorage().ler()).toBeNull();
      expect(window.localStorage.getItem(CHAVE_TESTE)).toBeNull();
    }
  );

  it("ignora itens que nao sao objetos", () => {
    window.localStorage.setItem(
      CHAVE_TESTE,
      JSON.stringify({ itens: [null, 7, { produtoId: "p1" }], total: 0, atualizadoEm: "x" })
    );

    expect(criarStorage().ler()?.itens).toEqual([{ produtoId: "p1" }]);
  });
});

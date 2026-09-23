import { beforeEach, describe, expect, it } from "vitest";
import { BrowserPedidoRepository } from "@/fake-api/repositories/pedido.repository";
import type { Pedido } from "@/types/pedido";

const CHAVE_TESTE = "origem:test:pedidos:repository:v1";

function pedido(overrides: Partial<Pedido> = {}): Pedido {
  return {
    id: "pedido-teste-1",
    compradorId: "comprador-teste",
    itens: [{ produtoId: "p1", nome: "Produto p1", precoUnitario: 10, quantidade: 2 }],
    total: 20,
    numeroConfirmacao: "confirmacao-teste-1",
    status: "confirmado",
    criadoEm: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.removeItem(CHAVE_TESTE);
});

describe("BrowserPedidoRepository", () => {
  it("list retorna array vazio quando nada foi criado", async () => {
    const repo = new BrowserPedidoRepository(window.localStorage, CHAVE_TESTE);

    const pedidos = await repo.list();

    expect(pedidos).toEqual([]);
  });

  it("create adiciona o pedido e persiste no storage", async () => {
    const repo = new BrowserPedidoRepository(window.localStorage, CHAVE_TESTE);
    const novo = pedido();

    const criado = await repo.create(novo);
    const pedidos = await repo.list();

    expect(criado).toEqual(novo);
    expect(pedidos).toContainEqual(novo);
  });

  it("create preserva pedidos ja existentes", async () => {
    const repo = new BrowserPedidoRepository(window.localStorage, CHAVE_TESTE);
    await repo.create(pedido({ id: "pedido-teste-1" }));

    await repo.create(pedido({ id: "pedido-teste-2", numeroConfirmacao: "confirmacao-teste-2" }));
    const pedidos = await repo.list();

    expect(pedidos).toHaveLength(2);
  });

  it("dados sobrevivem a uma nova instancia apontando para a mesma chave", async () => {
    const primeiraInstancia = new BrowserPedidoRepository(window.localStorage, CHAVE_TESTE);
    await primeiraInstancia.create(pedido());

    const segundaInstancia = new BrowserPedidoRepository(window.localStorage, CHAVE_TESTE);
    const pedidos = await segundaInstancia.list();

    expect(pedidos).toHaveLength(1);
  });
});

import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BrowserProdutoRepository } from "@/fake-api/repositories/produto.repository";
import { BrowserPedidoRepository } from "@/fake-api/repositories/pedido.repository";
import { FakeIndicadoresArtesaoService } from "@/services/fake/indicadores-artesao.service";
import type { Pedido } from "@/types/pedido";

const produtos = new BrowserProdutoRepository(
  window.localStorage,
  "origem:test:web5:produtos",
);
const pedidos = new BrowserPedidoRepository(
  window.localStorage,
  "origem:test:web5:pedidos",
);
const agora = new Date("2026-10-25T12:00:00.000Z");
let artesaoAtual: string | null = "artesao-a";
const service = new FakeIndicadoresArtesaoService(produtos, pedidos, {
  obterArtesaoId: () => artesaoAtual,
  agora: () => agora,
});
const pedido: Pedido = {
  id: "pedido-1",
  compradorId: "comprador",
  status: "confirmado",
  total: 999,
  numeroConfirmacao: "fake-1",
  criadoEm: "2026-10-12T12:00:00.000Z",
  itens: [
    { produtoId: "a1", nome: "Peca A", quantidade: 2, precoUnitario: 10.11 },
    { produtoId: "a1", nome: "Peca A", quantidade: 1, precoUnitario: 10.11 },
    { produtoId: "a2", nome: "Peca C", quantidade: 3, precoUnitario: 7.03 },
    { produtoId: "b1", nome: "Peca B", quantidade: 5, precoUnitario: 3.09 },
  ],
};
afterEach(() => vi.restoreAllMocks());

beforeEach(async () => {
  artesaoAtual = "artesao-a";
  window.localStorage.removeItem("origem:test:web5:produtos");
  window.localStorage.removeItem("origem:test:web5:pedidos");
  for (const id of ["a1", "a2", "b1"]) {
    await produtos.create({
      id,
      artesaoId: id === "b1" ? "artesao-b" : "artesao-a",
      nome: id,
      descricao: "Sintetico Web.5",
      preco: 999,
      categoriaId: "c",
      tecnicaId: "t",
      regiaoId: "r",
      fotos: [],
      quantidadeEstoque: 0,
      quantidadeVendida: 900,
      notaMedia: 0,
      ativo: false,
      desativadoPorAdmin: true,
      criadoEm: pedido.criadoEm,
    });
  }
});

it("agrega pedidos confirmados, precos congelados e pedidos distintos", async () => {
  await pedidos.create(pedido);
  await pedidos.create({
    ...pedido,
    id: "pedido-2",
    criadoEm: "2026-10-13T12:00:00.000Z",
    itens: [
      { produtoId: "a1", nome: "Peca A", quantidade: 4, precoUnitario: 0.1 },
    ],
  });
  for (const status of ["pendente", "cancelado"] as const)
    await pedidos.create({
      ...pedido,
      id: status,
      status,
      criadoEm: "2026-10-24T12:00:00.000Z",
    });
  expect(await service.obter()).toEqual({
    quantidadeVendida: 10,
    receitaTotal: 51.82,
    numeroPedidos: 2,
    ultimaVenda: "2026-10-13T12:00:00.000Z",
    atualizadoEm: agora.toISOString(),
  });
  artesaoAtual = "artesao-b";
  expect(await service.obter()).toEqual({
    quantidadeVendida: 5,
    receitaTotal: 15.45,
    numeroPedidos: 1,
    ultimaVenda: pedido.criadoEm,
    atualizadoEm: agora.toISOString(),
  });
});

it("retorna vazio para artesao sem vendas, sem fabricar receita", async () => {
  await pedidos.create({ ...pedido, status: "cancelado" });
  expect(await service.obter()).toEqual({
    quantidadeVendida: 0,
    receitaTotal: 0,
    numeroPedidos: 0,
    ultimaVenda: null,
    atualizadoEm: agora.toISOString(),
  });
});

it("exige sessao de artesao", async () => {
  artesaoAtual = null;
  await expect(service.obter()).rejects.toMatchObject({
    code: "NAO_AUTENTICADO",
  });
});

it("propaga falha do storage sem produzir indicadores zerados", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new DOMException("Storage indisponivel", "SecurityError");
  });
  await expect(service.obter()).rejects.toMatchObject({
    name: "SecurityError",
  });
});

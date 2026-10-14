import { beforeEach, expect, it } from "vitest";
import { BrowserPedidoRepository } from "@/fake-api/repositories/pedido.repository";
import { BrowserProdutoRepository } from "@/fake-api/repositories/produto.repository";
import { FakePedidosService } from "@/services/fake/pedidos.service";
import type { Pedido } from "@/types/pedido";

const chave = "origem:test:web11:pedidos";
let compradorAtual: string | null;
let repositorio: BrowserPedidoRepository;
let service: FakePedidosService;
const pedido: Pedido = {
  id: "11111111-1111-4111-8111-111111111111",
  compradorId: "comprador-1",
  numeroConfirmacao: "confirmacao-fake",
  status: "confirmado",
  total: 10,
  criadoEm: "2026-10-10T12:00:00.000Z",
  itens: [
    { produtoId: "produto-1", nome: "Vaso", quantidade: 1, precoUnitario: 10 },
  ],
};
beforeEach(() => {
  window.localStorage.removeItem(chave);
  compradorAtual = "comprador-1";
  repositorio = new BrowserPedidoRepository(window.localStorage, chave);
  service = new FakePedidosService(
    new BrowserProdutoRepository(window.localStorage),
    repositorio,
    {
      obterCompradorId: () => compradorAtual,
    },
  );
});

it("Fake API lista apenas a conta atual, ordenada e paginada", async () => {
  await repositorio.create(pedido);
  await repositorio.create({
    ...pedido,
    id: "22222222-2222-4222-8222-222222222222",
    criadoEm: "2026-10-11T12:00:00.000Z",
  });
  await repositorio.create({
    ...pedido,
    id: "33333333-3333-4333-8333-333333333333",
    compradorId: "comprador-2",
  });
  const primeira = await service.listarMeus({ pagina: 1, limite: 1 });
  expect(primeira.total).toBe(2);
  expect(primeira.itens.map((item) => item.id)).toEqual([
    "22222222-2222-4222-8222-222222222222",
  ]);
  const segunda = await service.listarMeus({ pagina: 2, limite: 1 });
  expect(segunda.itens.map((item) => item.id)).toEqual([pedido.id]);
});

it("Fake API usa 404 identico para terceiro e inexistente", async () => {
  await repositorio.create(pedido);
  compradorAtual = "comprador-2";
  await expect(service.obter(pedido.id)).rejects.toMatchObject({
    code: "PEDIDO_NAO_ENCONTRADO",
  });
  await expect(
    service.obter("44444444-4444-4444-8444-444444444444"),
  ).rejects.toMatchObject({ code: "PEDIDO_NAO_ENCONTRADO" });
});

it("Fake API exige sessao de comprador para leitura", async () => {
  compradorAtual = null;
  await expect(service.listarMeus()).rejects.toMatchObject({
    code: "NAO_AUTENTICADO",
  });
  await expect(service.obter(pedido.id)).rejects.toMatchObject({
    code: "NAO_AUTENTICADO",
  });
});

it("Fake API preserva valores gravados e nao inventa pagamento legado", async () => {
  await repositorio.create(pedido);
  const detalhe = await service.obter(pedido.id);
  expect(detalhe.itens).toEqual([{ ...pedido.itens[0], subtotal: 10 }]);
  expect(detalhe.pagamento).toBeNull();
});

it("Fake API registra pagamento simulado para novos pedidos", async () => {
  const produtos = new BrowserProdutoRepository(
    window.localStorage,
    "origem:test:web11:produtos",
  );
  window.localStorage.removeItem("origem:test:web11:produtos");
  const produto = await produtos.create({
    id: "web11-produto",
    nome: "Vaso",
    descricao: "Sintetico",
    preco: 10,
    categoriaId: "c1",
    tecnicaId: "t1",
    regiaoId: "r1",
    artesaoId: "a1",
    fotos: [],
    quantidadeEstoque: 2,
    quantidadeVendida: 0,
    notaMedia: 0,
    ativo: true,
    criadoEm: pedido.criadoEm,
  });
  const compradorService = new FakePedidosService(produtos, repositorio, {
    obterCompradorId: () => compradorAtual,
  });
  const criado = await compradorService.confirmar(
    [{ produtoId: produto.id, quantidade: 1 }],
    "comprador-1",
  );
  const detalhe = await compradorService.obter(criado.id);
  expect(detalhe.pagamento).toMatchObject({
    status: "aprovado",
    metodo: "pix_simulado",
    valor: 10,
  });
});

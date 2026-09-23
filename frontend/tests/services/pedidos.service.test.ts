import { beforeEach, describe, expect, it } from "vitest";
import { BrowserProdutoRepository } from "@/fake-api/repositories/produto.repository";
import { BrowserPedidoRepository } from "@/fake-api/repositories/pedido.repository";
import { FakePedidosService } from "@/services/fake/pedidos.service";
import { ServiceError } from "@/services/errors";
import type { Produto } from "@/types/produto";

const CHAVE_PRODUTOS_TESTE = "origem:test:pedidos:service:produtos:v1";
const CHAVE_PEDIDOS_TESTE = "origem:test:pedidos:service:pedidos:v1";
const COMPRADOR_TESTE = "comprador-teste";

function produto(overrides: Partial<Produto> = {}): Produto {
  return {
    id: "produto-teste-1",
    nome: "Vaso de Barro",
    descricao: "Vaso modelado a mao com argila da regiao.",
    preco: 50,
    categoriaId: "categoria-teste",
    tecnicaId: "",
    regiaoId: "",
    artesaoId: "artesao-teste",
    fotos: [],
    quantidadeEstoque: 5,
    quantidadeVendida: 0,
    notaMedia: 0,
    ativo: true,
    criadoEm: new Date().toISOString(),
    ...overrides,
  };
}

function criarContexto() {
  const produtoRepository = new BrowserProdutoRepository(
    window.localStorage,
    CHAVE_PRODUTOS_TESTE
  );
  const pedidoRepository = new BrowserPedidoRepository(
    window.localStorage,
    CHAVE_PEDIDOS_TESTE
  );
  const service = new FakePedidosService(produtoRepository, pedidoRepository, {
    latenciaMs: 0,
  });
  return { produtoRepository, pedidoRepository, service };
}

beforeEach(() => {
  window.localStorage.removeItem(CHAVE_PRODUTOS_TESTE);
  window.localStorage.removeItem(CHAVE_PEDIDOS_TESTE);
});

describe("FakePedidosService.confirmar — pedido valido", () => {
  it("confirma o pedido, reduz estoque e incrementa quantidade vendida", async () => {
    const { produtoRepository, service } = criarContexto();
    const criado = await produtoRepository.create(produto({ quantidadeEstoque: 5 }));

    const pedidoConfirmado = await service.confirmar(
      [{ produtoId: criado.id, quantidade: 2 }],
      COMPRADOR_TESTE
    );

    expect(pedidoConfirmado.status).toBe("confirmado");
    expect(pedidoConfirmado.compradorId).toBe(COMPRADOR_TESTE);
    expect(pedidoConfirmado.total).toBe(100);

    const persistido = await produtoRepository.findById(criado.id);
    expect(persistido?.quantidadeEstoque).toBe(3);
    expect(persistido?.quantidadeVendida).toBe(2);
  });

  it("congela nome e preco unitario do produto no momento da confirmacao", async () => {
    const { produtoRepository, service } = criarContexto();
    const criado = await produtoRepository.create(
      produto({ nome: "Cesto de Fibra", preco: 45 })
    );

    const pedidoConfirmado = await service.confirmar(
      [{ produtoId: criado.id, quantidade: 1 }],
      COMPRADOR_TESTE
    );

    expect(pedidoConfirmado.itens).toEqual([
      { produtoId: criado.id, nome: "Cesto de Fibra", precoUnitario: 45, quantidade: 1 },
    ]);
  });

  it("nunca aceita compradorId, preco ou total forjados na entrada", async () => {
    const { produtoRepository, service } = criarContexto();
    const criado = await produtoRepository.create(produto({ preco: 50 }));

    const itensForjados = [{ produtoId: criado.id, quantidade: 1 }];
    (itensForjados[0] as unknown as Record<string, unknown>).precoUnitario = 1;
    (itensForjados[0] as unknown as Record<string, unknown>).total = 1;

    const pedidoConfirmado = await service.confirmar(itensForjados, COMPRADOR_TESTE);

    expect(pedidoConfirmado.total).toBe(50);
    expect(pedidoConfirmado.itens[0]?.precoUnitario).toBe(50);
    expect(pedidoConfirmado.compradorId).toBe(COMPRADOR_TESTE);
  });

  it("gera numero de confirmacao distinto em 10 pedidos consecutivos", async () => {
    const { produtoRepository, service } = criarContexto();
    const criado = await produtoRepository.create(produto({ quantidadeEstoque: 100 }));

    const numeros = new Set<string>();
    for (let i = 0; i < 10; i += 1) {
      const pedidoConfirmado = await service.confirmar(
        [{ produtoId: criado.id, quantidade: 1 }],
        COMPRADOR_TESTE
      );
      numeros.add(pedidoConfirmado.numeroConfirmacao);
    }

    expect(numeros.size).toBe(10);
  });
});

describe("FakePedidosService.confirmar — carrinho vazio", () => {
  it("rejeita confirmacao sem itens e nao grava pedido", async () => {
    const { pedidoRepository, service } = criarContexto();

    await expect(service.confirmar([], COMPRADOR_TESTE)).rejects.toBeInstanceOf(
      ServiceError
    );
    await expect(service.confirmar([], COMPRADOR_TESTE)).rejects.toMatchObject({
      code: "CARRINHO_VAZIO",
    });

    const pedidos = await pedidoRepository.list();
    expect(pedidos).toEqual([]);
  });
});

describe("FakePedidosService.confirmar — estoque insuficiente", () => {
  it("rejeita e nomeia o produto em falta, sem gravar pedido nem alterar estoque de nenhum item", async () => {
    const { produtoRepository, pedidoRepository, service } = criarContexto();
    const disponivel = await produtoRepository.create(
      produto({ id: "produto-disponivel", quantidadeEstoque: 10 })
    );
    const escasso = await produtoRepository.create(
      produto({ id: "produto-escasso", nome: "Rede de Palha", quantidadeEstoque: 1 })
    );

    await expect(
      service.confirmar(
        [
          { produtoId: disponivel.id, quantidade: 2 },
          { produtoId: escasso.id, quantidade: 5 },
        ],
        COMPRADOR_TESTE
      )
    ).rejects.toMatchObject({
      code: "ESTOQUE_INSUFICIENTE",
      details: { produtoId: escasso.id, nome: "Rede de Palha" },
    });

    const pedidos = await pedidoRepository.list();
    expect(pedidos).toEqual([]);

    const disponivelPersistido = await produtoRepository.findById(disponivel.id);
    expect(disponivelPersistido?.quantidadeEstoque).toBe(10);

    const escassoPersistido = await produtoRepository.findById(escasso.id);
    expect(escassoPersistido?.quantidadeEstoque).toBe(1);
  });
});

describe("FakePedidosService.confirmar — produto inativo", () => {
  it("rejeita confirmacao com produto inativo e nao grava pedido", async () => {
    const { produtoRepository, pedidoRepository, service } = criarContexto();
    const inativo = await produtoRepository.create(produto({ ativo: false }));

    await expect(
      service.confirmar([{ produtoId: inativo.id, quantidade: 1 }], COMPRADOR_TESTE)
    ).rejects.toMatchObject({ code: "PRODUTO_INDISPONIVEL" });

    const pedidos = await pedidoRepository.list();
    expect(pedidos).toEqual([]);
  });

  it("rejeita confirmacao com produto inexistente", async () => {
    const { service, pedidoRepository } = criarContexto();

    await expect(
      service.confirmar(
        [{ produtoId: "produto-inexistente", quantidade: 1 }],
        COMPRADOR_TESTE
      )
    ).rejects.toMatchObject({ code: "PRODUTO_INDISPONIVEL" });

    const pedidos = await pedidoRepository.list();
    expect(pedidos).toEqual([]);
  });
});

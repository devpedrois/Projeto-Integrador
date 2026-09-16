import { beforeEach, describe, expect, it } from "vitest";
import { BrowserProdutoRepository } from "@/fake-api/repositories/produto.repository";
import { FakeProdutosService } from "@/services/fake/produtos.service";
import { CATEGORIA_IDS } from "@/fake-api/seeds/categorias.seed";
import { ServiceError } from "@/services/errors";
import type { NovoProdutoInput } from "@/types/novo-produto";

const CHAVE_TESTE = "origem:test:produtos:service:v1";

function entradaValida(
  overrides: Partial<NovoProdutoInput> = {}
): NovoProdutoInput {
  return {
    nome: "Vaso de Barro",
    descricao: "Vaso modelado a mao com argila da regiao.",
    preco: 89.9,
    categoriaId: CATEGORIA_IDS.ceramicaBarro,
    fotos: [{ url: "https://origem.test/fotos/vaso.jpg" }],
    quantidadeEstoque: 5,
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.removeItem(CHAVE_TESTE);
});

describe("FakeProdutosService.list", () => {
  it("retorna uma Promise", () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    const resultado = service.list();

    expect(resultado).toBeInstanceOf(Promise);
  });

  it("retorna exatamente trinta produtos na primeira execucao", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    const produtos = await service.list();

    expect(produtos).toHaveLength(30);
  });

  it("cinco categorias possuem produtos e a sexta permanece cadastrada e vazia", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    const produtos = await service.list();
    const categoriasComProduto = new Set(produtos.map((produto) => produto.categoriaId));

    expect(categoriasComProduto.size).toBe(5);
    expect(categoriasComProduto.has(CATEGORIA_IDS.arteReciclada)).toBe(false);
  });

  it("respeita a latencia configurada", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 30 });

    const inicio = Date.now();
    await service.list();
    const duracao = Date.now() - inicio;

    expect(duracao).toBeGreaterThanOrEqual(25);
  });

  it("dados sobrevivem a uma nova instancia do repositorio na mesma chave", async () => {
    const repo1 = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service1 = new FakeProdutosService(repo1, { latenciaMs: 0 });
    await service1.list();

    const repo2 = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service2 = new FakeProdutosService(repo2, { latenciaMs: 0 });
    const produtos = await service2.list();

    expect(produtos).toHaveLength(30);
  });
});

describe("FakeProdutosService.create", () => {
  it("cria o produto vinculado ao artesao informado, ignorando qualquer artesaoId da entrada", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    const entrada = entradaValida();
    (entrada as unknown as Record<string, unknown>).artesaoId = "artesao-forjado";
    const criado = await service.create(entrada, "artesao-da-sessao");

    expect(criado.artesaoId).toBe("artesao-da-sessao");
    expect(criado.nome).toBe(entrada.nome);
    expect(criado.ativo).toBe(true);
    expect(criado.quantidadeVendida).toBe(0);
  });

  it("produto criado aparece na listagem do repositorio", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    const criado = await service.create(entradaValida(), "artesao-da-sessao");
    const produtos = await repo.list();

    expect(produtos.some((produto) => produto.id === criado.id)).toBe(true);
  });

  it("rejeita entrada invalida sem criar produto", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    await expect(
      service.create(entradaValida({ preco: 0 }), "artesao-da-sessao")
    ).rejects.toBeInstanceOf(ServiceError);
    const produtos = await repo.list();
    expect(produtos).toHaveLength(0);
  });
});

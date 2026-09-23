import { beforeEach, describe, expect, it } from "vitest";
import { BrowserProdutoRepository } from "@/fake-api/repositories/produto.repository";
import { FakeProdutosService } from "@/services/fake/produtos.service";
import { CATEGORIA_IDS } from "@/fake-api/seeds/categorias.seed";
import { TECNICA_IDS } from "@/fake-api/seeds/tecnicas.seed";
import { REGIAO_IDS } from "@/fake-api/seeds/regioes.seed";
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

  it("oculta da vitrine produto com estoque zerado", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });
    const criado = await service.create(entradaValida(), "artesao-a");
    await repo.update(criado.id, { quantidadeEstoque: 0 });

    const produtos = await service.list();

    expect(produtos.some((produto) => produto.id === criado.id)).toBe(false);
  });

  it("oculta da vitrine produto inativo", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });
    const criado = await service.create(entradaValida(), "artesao-a");
    await service.remove(criado.id, "artesao-a");

    const produtos = await service.list();

    expect(produtos.some((produto) => produto.id === criado.id)).toBe(false);
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

describe("FakeProdutosService.listByArtesao", () => {
  it("retorna somente produtos ativos do artesao informado", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    const produtoA = await service.create(entradaValida({ nome: "Produto Artesao A" }), "artesao-a");
    await service.create(entradaValida({ nome: "Produto Artesao B" }), "artesao-b");

    const produtosDoA = await service.listByArtesao("artesao-a");

    expect(produtosDoA).toHaveLength(1);
    expect(produtosDoA[0]?.id).toBe(produtoA.id);
  });

  it("nao retorna produtos de outro artesao mesmo com mesmo prefixo de id", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    await service.create(entradaValida(), "artesao-a");
    await service.create(entradaValida(), "artesao-a-2");

    const produtosDoA = await service.listByArtesao("artesao-a");

    expect(produtosDoA).toHaveLength(1);
  });

  it("retorna array vazio quando o artesao nao possui produtos", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    const produtos = await service.listByArtesao("artesao-sem-produtos");

    expect(produtos).toEqual([]);
  });

  it("o proprio artesao ainda ve produto com estoque zerado em Meus produtos", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });
    const criado = await service.create(entradaValida(), "artesao-a");
    await repo.update(criado.id, { quantidadeEstoque: 0 });

    const produtos = await service.listByArtesao("artesao-a");

    expect(produtos.some((produto) => produto.id === criado.id)).toBe(true);
  });

  it("produto removido logicamente deixa de aparecer na listagem do dono", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    const criado = await service.create(entradaValida(), "artesao-a");
    await service.remove(criado.id, "artesao-a");

    const produtos = await service.listByArtesao("artesao-a");

    expect(produtos).toEqual([]);
  });
});

describe("FakeProdutosService.update", () => {
  it("atualiza os campos e preserva o artesaoId original", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    const criado = await service.create(entradaValida(), "artesao-a");
    const atualizado = await service.update(
      criado.id,
      entradaValida({ nome: "Nome Atualizado", preco: 120 }),
      "artesao-a"
    );

    expect(atualizado.nome).toBe("Nome Atualizado");
    expect(atualizado.preco).toBe(120);
    expect(atualizado.artesaoId).toBe("artesao-a");
    expect(atualizado.id).toBe(criado.id);
  });

  it("ignora artesaoId manipulado na entrada e preserva o original", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    const criado = await service.create(entradaValida(), "artesao-a");
    const entrada = entradaValida({ nome: "Tentativa de sequestro" });
    (entrada as unknown as Record<string, unknown>).artesaoId = "artesao-invasor";

    const atualizado = await service.update(criado.id, entrada, "artesao-a");

    expect(atualizado.artesaoId).toBe("artesao-a");
  });

  it("rejeita atualizacao de produto de outra conta", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    const criado = await service.create(entradaValida(), "artesao-dono");

    await expect(
      service.update(criado.id, entradaValida({ nome: "Invasao" }), "artesao-invasor")
    ).rejects.toBeInstanceOf(ServiceError);

    const persistido = await repo.findById(criado.id);
    expect(persistido?.nome).not.toBe("Invasao");
  });

  it("rejeita atualizacao de produto inexistente", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    await expect(
      service.update("produto-inexistente", entradaValida(), "artesao-a")
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it("rejeita entrada invalida sem alterar o produto", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    const criado = await service.create(entradaValida(), "artesao-a");

    await expect(
      service.update(criado.id, entradaValida({ preco: -1 }), "artesao-a")
    ).rejects.toBeInstanceOf(ServiceError);

    const persistido = await repo.findById(criado.id);
    expect(persistido?.preco).toBe(criado.preco);
  });
});

describe("FakeProdutosService.search", () => {
  it("retorna exatamente os tres produtos-semente conhecidos para o termo", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    const resultado = await service.search({ termo: "esculpid" });

    expect(resultado.map((produto) => produto.id).sort()).toEqual(
      ["produto-seed-04", "produto-seed-14", "produto-seed-18"].sort()
    );
  });

  it("ignora caixa ao buscar", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    const resultado = await service.search({ termo: "ESCULPID" });

    expect(resultado).toHaveLength(3);
  });

  it("ignora acentos ao buscar", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    const resultado = await service.search({ termo: "ésculpíd" });

    expect(resultado).toHaveLength(3);
  });

  it("busca tambem no campo descricao, nao somente no nome", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    const resultado = await service.search({ termo: "esculpidos" });

    expect(resultado.map((produto) => produto.id)).toEqual(["produto-seed-18"]);
  });

  it("retorna array vazio quando nenhum produto corresponde ao termo", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    const resultado = await service.search({ termo: "termo-sem-correspondencia-xyz" });

    expect(resultado).toEqual([]);
  });

  it("retorna a lista completa quando o termo e vazio ou so espacos", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    const resultado = await service.search({ termo: "   " });

    expect(resultado).toHaveLength(30);
  });

  it("retorna a lista completa quando nenhum filtro esta ativo", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    const resultado = await service.search({});

    expect(resultado).toHaveLength(30);
  });

  it("filtra por artesaoId retornando somente os produtos daquele artesao", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    const resultado = await service.search({ artesaoId: "seed-artesao-01" });

    expect(resultado).toHaveLength(15);
    expect(resultado.every((produto) => produto.artesaoId === "seed-artesao-01")).toBe(true);
  });

  it("oculta da busca produto com estoque zerado", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });
    const criado = await service.create(
      entradaValida({ nome: "Peca Rara Zerada" }),
      "artesao-a"
    );
    await repo.update(criado.id, { quantidadeEstoque: 0 });

    const resultado = await service.search({ termo: "Peca Rara Zerada" });

    expect(resultado).toEqual([]);
  });

  it("oculta da busca produto inativo", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });
    const criado = await service.create(
      entradaValida({ nome: "Peca Removida" }),
      "artesao-a"
    );
    await service.remove(criado.id, "artesao-a");

    const resultado = await service.search({ termo: "Peca Removida" });

    expect(resultado).toEqual([]);
  });

  describe("cinco combinacoes de filtros ativos (semantica AND)", () => {
    it("combinacao 1: somente categoria retorna os seis produtos da categoria", async () => {
      const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
      const service = new FakeProdutosService(repo, { latenciaMs: 0 });

      const resultado = await service.search({
        categoriaId: CATEGORIA_IDS.ceramicaBarro,
      });

      expect(resultado.map((produto) => produto.id).sort()).toEqual(
        [
          "produto-seed-01",
          "produto-seed-02",
          "produto-seed-03",
          "produto-seed-04",
          "produto-seed-05",
          "produto-seed-06",
        ].sort()
      );
    });

    it("combinacao 2: somente tecnica retorna os quatro produtos trancados em fibra", async () => {
      const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
      const service = new FakeProdutosService(repo, { latenciaMs: 0 });

      const resultado = await service.search({
        tecnicaId: TECNICA_IDS.trancadoFibra,
      });

      expect(resultado.map((produto) => produto.id).sort()).toEqual(
        [
          "produto-seed-26",
          "produto-seed-28",
          "produto-seed-29",
          "produto-seed-30",
        ].sort()
      );
    });

    it("combinacao 3: somente regiao retorna os dez produtos de Tracunhaem", async () => {
      const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
      const service = new FakeProdutosService(repo, { latenciaMs: 0 });

      const resultado = await service.search({
        regiaoId: REGIAO_IDS.tracunhaem,
      });

      expect(resultado).toHaveLength(10);
      expect(
        resultado.every((produto) => produto.regiaoId === REGIAO_IDS.tracunhaem)
      ).toBe(true);
    });

    it("combinacao 4: categoria e regiao juntas aplicam AND e restringem para dois produtos", async () => {
      const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
      const service = new FakeProdutosService(repo, { latenciaMs: 0 });

      const resultado = await service.search({
        categoriaId: CATEGORIA_IDS.madeiraEntalhada,
        regiaoId: REGIAO_IDS.pilarRecife,
      });

      expect(resultado.map((produto) => produto.id).sort()).toEqual(
        ["produto-seed-13", "produto-seed-16"].sort()
      );
    });

    it("combinacao 5: termo, categoria e tecnica juntos aplicam AND e restringem para tres produtos", async () => {
      const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
      const service = new FakeProdutosService(repo, { latenciaMs: 0 });

      const resultado = await service.search({
        termo: "renda",
        categoriaId: CATEGORIA_IDS.rendaBordado,
        tecnicaId: TECNICA_IDS.rendaIrlandesa,
      });

      expect(resultado.map((produto) => produto.id).sort()).toEqual(
        ["produto-seed-07", "produto-seed-09", "produto-seed-12"].sort()
      );
    });
  });
});

describe("FakeProdutosService.remove", () => {
  it("marca o produto como inativo (remocao logica) sem apagar o registro", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    const criado = await service.create(entradaValida(), "artesao-a");
    await service.remove(criado.id, "artesao-a");

    const persistido = await repo.findById(criado.id);
    expect(persistido).not.toBeNull();
    expect(persistido?.ativo).toBe(false);
  });

  it("rejeita remocao de produto de outra conta e preserva o registro ativo", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    const criado = await service.create(entradaValida(), "artesao-dono");

    await expect(
      service.remove(criado.id, "artesao-invasor")
    ).rejects.toBeInstanceOf(ServiceError);

    const persistido = await repo.findById(criado.id);
    expect(persistido?.ativo).toBe(true);
  });

  it("rejeita remocao de produto inexistente", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeProdutosService(repo, { latenciaMs: 0 });

    await expect(
      service.remove("produto-inexistente", "artesao-a")
    ).rejects.toBeInstanceOf(ServiceError);
  });
});

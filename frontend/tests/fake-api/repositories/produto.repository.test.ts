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

  it("create adiciona o produto e persiste no storage", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    const novo = {
      id: "produto-teste-1",
      nome: "Cesto de Fibra",
      descricao: "Cesto trancado a mao com fibra natural.",
      preco: 45,
      categoriaId: "categoria-teste",
      tecnicaId: "",
      regiaoId: "",
      artesaoId: "artesao-teste",
      fotos: [{ url: "https://origem.test/fotos/cesto.jpg", ordem: 0 }],
      quantidadeEstoque: 3,
      quantidadeVendida: 0,
      notaMedia: 0,
      ativo: true,
      criadoEm: new Date().toISOString(),
    };

    const criado = await repo.create(novo);
    const produtos = await repo.list();

    expect(criado).toEqual(novo);
    expect(produtos).toContainEqual(novo);
  });

  it("create preserva produtos ja existentes", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();
    const antes = await repo.list();

    await repo.create({
      id: "produto-teste-2",
      nome: "Rede de Palha",
      descricao: "Rede tecida artesanalmente com palha da regiao.",
      preco: 120,
      categoriaId: "categoria-teste",
      tecnicaId: "",
      regiaoId: "",
      artesaoId: "artesao-teste",
      fotos: [{ url: "https://origem.test/fotos/rede.jpg", ordem: 0 }],
      quantidadeEstoque: 1,
      quantidadeVendida: 0,
      notaMedia: 0,
      ativo: true,
      criadoEm: new Date().toISOString(),
    });
    const depois = await repo.list();

    expect(depois).toHaveLength(antes.length + 1);
  });

  it("findById retorna o produto correspondente", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();
    const produtos = await repo.list();
    const alvo = produtos[0];
    if (!alvo) throw new Error("seed deveria conter ao menos um produto");

    const encontrado = await repo.findById(alvo.id);

    expect(encontrado).toEqual(alvo);
  });

  it("findById retorna null quando o produto nao existe", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();

    const encontrado = await repo.findById("produto-inexistente");

    expect(encontrado).toBeNull();
  });

  it("update altera somente os campos informados e preserva o restante", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();
    const produtos = await repo.list();
    const alvo = produtos[0];
    if (!alvo) throw new Error("seed deveria conter ao menos um produto");

    const atualizado = await repo.update(alvo.id, { nome: "Nome Editado" });

    expect(atualizado).toEqual({ ...alvo, nome: "Nome Editado" });
    const persistido = await repo.findById(alvo.id);
    expect(persistido?.nome).toBe("Nome Editado");
  });

  it("update retorna null quando o produto nao existe", async () => {
    const repo = new BrowserProdutoRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();

    const atualizado = await repo.update("produto-inexistente", { nome: "X" });

    expect(atualizado).toBeNull();
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { BrowserAvaliacaoRepository } from "@/fake-api/repositories/avaliacao.repository";
import { BrowserProdutoRepository } from "@/fake-api/repositories/produto.repository";
import { FakeAvaliacoesService } from "@/services/fake/avaliacoes.service";
import { AVALIACOES_SEED } from "@/fake-api/seeds/avaliacoes.seed";
import { ServiceError } from "@/services/errors";

const CHAVE_TESTE = "origem:test:avaliacoes:service:v1";
const CHAVE_PRODUTOS_TESTE = "origem:test:avaliacoes:service:produtos:v1";

function criarService(latenciaMs = 0): FakeAvaliacoesService {
  const repo = new BrowserAvaliacaoRepository(window.localStorage, CHAVE_TESTE);
  const produtos = new BrowserProdutoRepository(window.localStorage, CHAVE_PRODUTOS_TESTE);
  return new FakeAvaliacoesService(repo, produtos, { latenciaMs });
}

function produtosAvaliadosNoSeed(): string[] {
  return [...new Set(AVALIACOES_SEED.map((a) => a.produtoId))];
}

beforeEach(() => {
  window.localStorage.removeItem(CHAVE_TESTE);
  window.localStorage.removeItem(CHAVE_PRODUTOS_TESTE);
});

describe("FakeAvaliacoesService.listByProduto", () => {
  it("retorna uma Promise", () => {
    expect(criarService().listByProduto("produto-seed-01")).toBeInstanceOf(Promise);
  });

  it("retorna avaliacoes semeadas para pelo menos tres produtos", async () => {
    const service = criarService();
    const produtos = produtosAvaliadosNoSeed();

    expect(produtos.length).toBeGreaterThanOrEqual(3);
    for (const produtoId of produtos) {
      const avaliacoes = await service.listByProduto(produtoId);
      expect(avaliacoes.length).toBeGreaterThan(0);
      expect(avaliacoes.every((a) => a.produtoId === produtoId)).toBe(true);
    }
  });

  it("ordena da avaliacao mais recente para a mais antiga", async () => {
    const service = criarService();
    const produtoComVarias = produtosAvaliadosNoSeed().find(
      (id) => AVALIACOES_SEED.filter((a) => a.produtoId === id).length > 1
    );
    if (!produtoComVarias) throw new Error("seed deveria ter produto com varias avaliacoes");

    const avaliacoes = await service.listByProduto(produtoComVarias);
    const datas = avaliacoes.map((a) => a.criadoEm);

    expect(datas).toEqual([...datas].sort().reverse());
  });

  it("retorna lista vazia para produto sem avaliacoes", async () => {
    expect(await criarService().listByProduto("produto-inexistente")).toEqual([]);
  });

  it("respeita a latencia configurada", async () => {
    const inicio = Date.now();
    await criarService(30).listByProduto("produto-seed-01");

    expect(Date.now() - inicio).toBeGreaterThanOrEqual(25);
  });
});

describe("FakeAvaliacoesService.resumo", () => {
  it("retorna media e quantidade das avaliacoes do produto", async () => {
    const service = criarService();
    const produtoId = produtosAvaliadosNoSeed()[0] as string;
    const notas = AVALIACOES_SEED.filter((a) => a.produtoId === produtoId).map((a) => a.nota);
    const soma = notas.reduce((total, nota) => total + nota, 0);
    const mediaEsperada = Math.round((soma / notas.length) * 10) / 10;

    const resumo = await service.resumo(produtoId);

    expect(resumo).toEqual({ produtoId, media: mediaEsperada, quantidade: notas.length });
  });

  it("retorna media zero e quantidade zero para produto sem avaliacoes", async () => {
    expect(await criarService().resumo("produto-inexistente")).toEqual({
      produtoId: "produto-inexistente",
      media: 0,
      quantidade: 0,
    });
  });
});

describe("FakeAvaliacoesService.create", () => {
  it("persiste avaliacao valida e reflete no resumo", async () => {
    const service = criarService();

    const criada = await service.create(
      { produtoId: "produto-seed-30", nota: 4, comentario: "  Peca bem acabada.  " },
      "seed-comprador-01"
    );

    expect(criada).toMatchObject({
      produtoId: "produto-seed-30",
      compradorId: "seed-comprador-01",
      nota: 4,
      comentario: "Peca bem acabada.",
    });
    expect(criada.id).toBeTruthy();
    expect(await service.resumo("produto-seed-30")).toEqual({
      produtoId: "produto-seed-30",
      media: 4,
      quantidade: 1,
    });
  });

  it("aceita avaliacao sem comentario", async () => {
    const criada = await criarService().create(
      { produtoId: "produto-seed-30", nota: 1 },
      "seed-comprador-01"
    );

    expect("comentario" in criada).toBe(false);
  });

  it.each([0, 6, -1, 3.5, Number.NaN])(
    "rejeita nota %s fora do intervalo inteiro de 1 a 5",
    async (nota) => {
      const service = criarService();

      await expect(
        service.create({ produtoId: "produto-seed-30", nota }, "seed-comprador-01")
      ).rejects.toMatchObject({ code: "AVALIACAO_INVALIDA" });
      expect(await service.listByProduto("produto-seed-30")).toEqual([]);
    }
  );

  it("rejeita comentario acima do limite", async () => {
    await expect(
      criarService().create(
        { produtoId: "produto-seed-30", nota: 5, comentario: "a".repeat(501) },
        "seed-comprador-01"
      )
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it("rejeita comprador ausente", async () => {
    await expect(
      criarService().create({ produtoId: "produto-seed-30", nota: 5 }, "  ")
    ).rejects.toMatchObject({ code: "NAO_AUTENTICADO" });
  });

  it("rejeita produto inexistente", async () => {
    await expect(
      criarService().create({ produtoId: "produto-inexistente", nota: 5 }, "seed-comprador-01")
    ).rejects.toMatchObject({ code: "PRODUTO_NAO_ENCONTRADO" });
  });

  it("rejeita produto inativo", async () => {
    const produtos = new BrowserProdutoRepository(window.localStorage, CHAVE_PRODUTOS_TESTE);
    await produtos.seed();
    await produtos.update("produto-seed-30", { ativo: false });

    await expect(
      criarService().create({ produtoId: "produto-seed-30", nota: 5 }, "seed-comprador-01")
    ).rejects.toMatchObject({ code: "PRODUTO_NAO_ENCONTRADO" });
  });

  it("rejeita segunda avaliacao do mesmo comprador para o mesmo produto", async () => {
    const service = criarService();
    const existente = AVALIACOES_SEED[0];
    if (!existente) throw new Error("seed deveria conter ao menos uma avaliacao");

    await expect(
      service.create({ produtoId: existente.produtoId, nota: 5 }, existente.compradorId)
    ).rejects.toMatchObject({ code: "AVALIACAO_DUPLICADA" });
  });
});

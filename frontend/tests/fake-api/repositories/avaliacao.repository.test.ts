import { beforeEach, describe, expect, it } from "vitest";
import { BrowserAvaliacaoRepository } from "@/fake-api/repositories/avaliacao.repository";
import { AVALIACOES_SEED } from "@/fake-api/seeds/avaliacoes.seed";
import type { Avaliacao } from "@/types/avaliacao";

const CHAVE_TESTE = "origem:test:avaliacoes:repository:v1";

beforeEach(() => {
  window.localStorage.removeItem(CHAVE_TESTE);
});

describe("BrowserAvaliacaoRepository", () => {
  it("seed popula a carga sintetica na primeira execucao", async () => {
    const repo = new BrowserAvaliacaoRepository(window.localStorage, CHAVE_TESTE);

    await repo.seed();

    expect(await repo.list()).toEqual(AVALIACOES_SEED);
  });

  it("seed e idempotente e nao sobrescreve alteracoes existentes", async () => {
    const repo = new BrowserAvaliacaoRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();
    const [primeira, ...demais] = await repo.list();
    if (!primeira) throw new Error("seed deveria conter ao menos uma avaliacao");
    const alterada = { ...primeira, comentario: "Comentario alterado manualmente" };
    window.localStorage.setItem(CHAVE_TESTE, JSON.stringify([alterada, ...demais]));

    await repo.seed();
    const depois = await repo.list();

    expect(depois[0]?.comentario).toBe("Comentario alterado manualmente");
    expect(depois).toHaveLength(AVALIACOES_SEED.length);
  });

  it("listByProdutoId retorna somente avaliacoes do produto", async () => {
    const repo = new BrowserAvaliacaoRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();
    const alvo = AVALIACOES_SEED[0];
    if (!alvo) throw new Error("seed deveria conter ao menos uma avaliacao");

    const avaliacoes = await repo.listByProdutoId(alvo.produtoId);

    expect(avaliacoes.length).toBeGreaterThan(0);
    expect(avaliacoes.every((a) => a.produtoId === alvo.produtoId)).toBe(true);
  });

  it("create persiste a avaliacao e sobrevive a nova instancia", async () => {
    const repo = new BrowserAvaliacaoRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();
    const nova: Avaliacao = {
      id: "avaliacao-teste",
      produtoId: "produto-seed-30",
      compradorId: "seed-comprador-01",
      nota: 3,
      criadoEm: "2026-09-23T00:00:00.000Z",
    };

    await repo.create(nova);
    const outraInstancia = new BrowserAvaliacaoRepository(window.localStorage, CHAVE_TESTE);

    expect(await outraInstancia.listByProdutoId("produto-seed-30")).toContainEqual(nova);
  });
});

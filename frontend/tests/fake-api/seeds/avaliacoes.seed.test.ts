import { describe, expect, it } from "vitest";
import { AVALIACOES_SEED } from "@/fake-api/seeds/avaliacoes.seed";
import { PRODUTOS_SEED } from "@/fake-api/seeds/produtos.seed";
import { USUARIOS_SEED } from "@/fake-api/seeds/usuarios.seed";
import { calcularResumoAvaliacoes } from "@/domain/resumo-avaliacoes";

describe("AVALIACOES_SEED", () => {
  it("cobre pelo menos tres produtos existentes", () => {
    const idsProdutos = new Set(PRODUTOS_SEED.map((produto) => produto.id));
    const produtosAvaliados = new Set(AVALIACOES_SEED.map((a) => a.produtoId));

    expect(produtosAvaliados.size).toBeGreaterThanOrEqual(3);
    for (const produtoId of produtosAvaliados) {
      expect(idsProdutos.has(produtoId)).toBe(true);
    }
  });

  it("usa somente compradores sinteticos da carga de usuarios", () => {
    const compradores = new Set(
      USUARIOS_SEED.filter((u) => u.papel === "comprador").map((u) => u.id)
    );

    for (const avaliacao of AVALIACOES_SEED) {
      expect(compradores.has(avaliacao.compradorId)).toBe(true);
    }
  });

  it("possui notas inteiras entre 1 e 5", () => {
    for (const avaliacao of AVALIACOES_SEED) {
      expect(Number.isInteger(avaliacao.nota)).toBe(true);
      expect(avaliacao.nota).toBeGreaterThanOrEqual(1);
      expect(avaliacao.nota).toBeLessThanOrEqual(5);
    }
  });

  it("possui ids unicos e no maximo uma avaliacao por comprador e produto", () => {
    const ids = AVALIACOES_SEED.map((a) => a.id);
    const pares = AVALIACOES_SEED.map((a) => `${a.compradorId}|${a.produtoId}`);

    expect(new Set(ids).size).toBe(AVALIACOES_SEED.length);
    expect(new Set(pares).size).toBe(AVALIACOES_SEED.length);
  });

  it("possui datas ISO validas", () => {
    for (const avaliacao of AVALIACOES_SEED) {
      expect(new Date(avaliacao.criadoEm).toISOString()).toBe(avaliacao.criadoEm);
    }
  });

  it("mantem Produto.notaMedia coerente com as avaliacoes semeadas", () => {
    for (const produto of PRODUTOS_SEED) {
      const avaliacoes = AVALIACOES_SEED.filter((a) => a.produtoId === produto.id);
      const resumo = calcularResumoAvaliacoes(produto.id, avaliacoes);

      expect(produto.notaMedia).toBe(resumo.media);
    }
  });

  it("e deterministico entre execucoes do modulo", async () => {
    const outraImportacao = await import("@/fake-api/seeds/avaliacoes.seed");
    expect(outraImportacao.AVALIACOES_SEED).toEqual(AVALIACOES_SEED);
  });
});

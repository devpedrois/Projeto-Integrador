import { describe, expect, it } from "vitest";
import { CATEGORIAS_SEED } from "@/fake-api/seeds/categorias.seed";

describe("CATEGORIAS_SEED", () => {
  it("cadastra exatamente as seis categorias oficiais", () => {
    expect(CATEGORIAS_SEED).toHaveLength(6);
  });

  it("possui ids unicos", () => {
    const ids = CATEGORIAS_SEED.map((categoria) => categoria.id);
    expect(new Set(ids).size).toBe(6);
  });

  it("inclui Arte Reciclada e Sustentavel como sexta categoria", () => {
    expect(CATEGORIAS_SEED.map((categoria) => categoria.nome)).toContain(
      "Arte Reciclada e Sustentavel"
    );
  });
});

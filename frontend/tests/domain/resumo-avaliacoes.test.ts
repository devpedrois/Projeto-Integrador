import { describe, expect, it } from "vitest";
import { calcularResumoAvaliacoes } from "@/domain/resumo-avaliacoes";

describe("calcularResumoAvaliacoes", () => {
  it("retorna media zero e quantidade zero sem avaliacoes", () => {
    expect(calcularResumoAvaliacoes("produto-x", [])).toEqual({
      produtoId: "produto-x",
      media: 0,
      quantidade: 0,
    });
  });

  it("calcula a media aritmetica das notas", () => {
    const resumo = calcularResumoAvaliacoes("produto-x", [{ nota: 5 }, { nota: 4 }]);

    expect(resumo).toEqual({ produtoId: "produto-x", media: 4.5, quantidade: 2 });
  });

  it("arredonda a media para uma casa decimal", () => {
    const resumo = calcularResumoAvaliacoes("produto-x", [
      { nota: 5 },
      { nota: 4 },
      { nota: 4 },
    ]);

    expect(resumo.media).toBe(4.3);
    expect(resumo.quantidade).toBe(3);
  });
});

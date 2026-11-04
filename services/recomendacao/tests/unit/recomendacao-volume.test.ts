import { expect, it } from "vitest";
import {
  resumirRecomendacoes,
  resumirTempos,
} from "../../src/strategies/recomendacao-volume.metricas.js";

it("calcula cobertura, diversidade e fallback sem dividir por zero", () => {
  const resultado = resumirRecomendacoes(
    [
      {
        estrategia: "categoria",
        itens: [
          { id: "a", categoriaId: "alfa" },
          { id: "b", categoriaId: "beta" },
        ],
      },
      { estrategia: "fallback-geral", itens: [] },
    ],
    [
      { id: "a", categoriaId: "alfa" },
      { id: "b", categoriaId: "beta" },
      { id: "c", categoriaId: "beta" },
    ],
  );
  expect(resultado.totalRecomendacoes).toBe(2);
  expect(resultado.coberturaCatalogo.percentual).toBeCloseTo(200 / 3);
  expect(resultado.taxaFallback.percentual).toBe(50);
  expect(resultado.diversidadeCategorias.mediaPorResposta).toBe(1);
  expect(resumirRecomendacoes([], []).coberturaCatalogo.percentual).toBe(0);
});

it("calcula media e p95 nearest-rank e aceita ausencia de amostras", () => {
  expect(resumirTempos([10, 1, 4, 2, 3])).toEqual({
    amostras: 5,
    mediaMs: 4,
    p95Ms: 10,
  });
  expect(resumirTempos([])).toEqual({ amostras: 0, mediaMs: 0, p95Ms: 0 });
});

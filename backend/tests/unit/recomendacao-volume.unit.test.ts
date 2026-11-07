import { describe, expect, it } from "vitest";
import {
  resumirTempos,
  resumirRecomendacoes,
} from "../../scripts/helpers/recomendacao-tooling.js";

describe("IA-04: metricas independentes de ranking", () => {
  it("calcula cobertura do catalogo, cobertura v0, fallback e diversidade", () => {
    const resultado = resumirRecomendacoes(
      [
        {
          estrategia: "categoria",
          itens: [
            { id: "a", categoriaId: "ceramica" },
            { id: "b", categoriaId: "tecido" },
          ],
        },
        {
          estrategia: "fallback-geral",
          itens: [{ id: "a", categoriaId: "ceramica" }],
        },
        { estrategia: "fallback-geral", itens: [] },
      ],
      [
        { id: "a", categoriaId: "ceramica" },
        { id: "b", categoriaId: "tecido" },
        { id: "c", categoriaId: "madeira" },
        { id: "d", categoriaId: "madeira" },
      ],
    );
    expect(resultado.coberturaCatalogo).toEqual({
      numerador: 2,
      denominador: 4,
      percentual: 50,
    });
    expect(resultado.coberturaContextos.percentual).toBeCloseTo(200 / 3);
    expect(resultado.taxaFallback).toEqual({
      numerador: 2,
      denominador: 3,
      percentual: 200 / 3,
    });
    expect(resultado.diversidadeCategorias).toEqual({
      mediaPorResposta: 1,
      distintas: 2,
      elegiveis: 3,
      percentual: 200 / 3,
    });
    expect(resultado.totalRecomendacoes).toBe(3);
  });

  it("retorna zeros sem catalogo ou respostas", () => {
    const resultado = resumirRecomendacoes([], []);
    expect(resultado.coberturaCatalogo.percentual).toBe(0);
    expect(resultado.coberturaContextos.percentual).toBe(0);
    expect(resultado.taxaFallback.percentual).toBe(0);
    expect(resultado.diversidadeCategorias.mediaPorResposta).toBe(0);
    expect(resultado.diversidadeCategorias.percentual).toBe(0);
    expect(resumirTempos([])).toEqual({ amostras: 0, mediaMs: 0, p95Ms: 0 });
  });

  it("p95 usa nearest-rank e nao interpola ou confunde media", () => {
    const amostras = [20, ...Array.from({ length: 19 }, (_, i) => i + 1)];
    expect(resumirTempos(amostras)).toEqual({
      amostras: 20,
      mediaMs: 10.5,
      p95Ms: 19,
    });
    expect(amostras[0]).toBe(20);
    expect(resumirTempos([7])).toEqual({ amostras: 1, mediaMs: 7, p95Ms: 7 });
  });
});

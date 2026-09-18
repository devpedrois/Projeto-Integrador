import { describe, expect, it } from "vitest";
import {
  calcularAcertoCategoria,
  calcularCobertura,
} from "../../src/integrations/recommendation/recomendacao-metricas.js";

describe("calcularCobertura", () => {
  it("calcula o percentual quando ha produtos elegiveis", () => {
    expect(calcularCobertura(3, 5)).toBe(60);
  });

  it("retorna zero explicitamente quando o denominador e zero", () => {
    expect(calcularCobertura(0, 0)).toBe(0);
  });

  it("retorna cem quando todo produto elegivel recebe recomendacao", () => {
    expect(calcularCobertura(7, 7)).toBe(100);
  });

  it("retorna zero quando nenhum produto elegivel recebe recomendacao", () => {
    expect(calcularCobertura(0, 7)).toBe(0);
  });
});

describe("calcularAcertoCategoria", () => {
  it("calcula o percentual quando ha recomendacoes", () => {
    expect(calcularAcertoCategoria(4, 10)).toBe(40);
  });

  it("retorna zero explicitamente quando o denominador e zero", () => {
    expect(calcularAcertoCategoria(0, 0)).toBe(0);
  });

  it("retorna zero quando nenhuma recomendacao acerta a categoria", () => {
    expect(calcularAcertoCategoria(0, 32)).toBe(0);
  });

  it("retorna cem quando toda recomendacao acerta a categoria", () => {
    expect(calcularAcertoCategoria(32, 32)).toBe(100);
  });
});

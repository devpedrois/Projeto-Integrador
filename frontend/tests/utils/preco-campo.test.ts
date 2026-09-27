import { describe, expect, it } from "vitest";
import { formatarPrecoCampo, lerPrecoCampo } from "@/utils/preco-campo";

describe("formatarPrecoCampo", () => {
  it.each([
    [39.9, "39,90"],
    [45.5, "45,50"],
    [100, "100,00"],
    [0.01, "0,01"],
  ])("%s vira %s", (valor, esperado) => {
    expect(formatarPrecoCampo(valor)).toBe(esperado);
  });
});

describe("lerPrecoCampo", () => {
  it.each([
    ["39,90", 39.9],
    ["45,5", 45.5],
    ["89.90", 89.9],
    [" 12,00 ", 12],
    ["-0.5", -0.5],
    ["1.234,56", 1234.56],
  ])("%s vira %s", (texto, esperado) => {
    expect(lerPrecoCampo(texto)).toBe(esperado);
  });

  it("texto nao numerico vira NaN", () => {
    expect(lerPrecoCampo("abc")).toBeNaN();
  });
});
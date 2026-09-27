import { describe, expect, it } from "vitest";
import { formatarMoeda } from "@/utils/formatar-moeda";

const ESPACO = " ";

describe("formatarMoeda", () => {
  it.each([
    [89.9, `R$${ESPACO}89,90`],
    [0.01, `R$${ESPACO}0,01`],
    [100, `R$${ESPACO}100,00`],
    [1234.56, `R$${ESPACO}1.234,56`],
  ])("%s vira %s", (valor, esperado) => {
    expect(formatarMoeda(valor)).toBe(esperado);
  });
});

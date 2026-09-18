import { describe, expect, it } from "vitest";
import { normalizarTexto } from "@/utils/normalizar-texto";

describe("normalizarTexto", () => {
  it("converte para minusculas", () => {
    expect(normalizarTexto("ESCULPIDA")).toBe("esculpida");
  });

  it("remove acentos de forma deterministica", () => {
    expect(normalizarTexto("Cerâmica Esculpída")).toBe("ceramica esculpida");
  });

  it("colapsa espacos internos multiplos em um unico espaco", () => {
    expect(normalizarTexto("Jarra   Ceramica    Esculpida")).toBe(
      "jarra ceramica esculpida"
    );
  });

  it("remove espacos nas extremidades", () => {
    expect(normalizarTexto("   esculpida   ")).toBe("esculpida");
  });

  it("combina minusculas, acentos e espacos na mesma chamada", () => {
    expect(normalizarTexto("  JARRA   CERÂMICA  ESCULPÍDA  ")).toBe(
      "jarra ceramica esculpida"
    );
  });
});

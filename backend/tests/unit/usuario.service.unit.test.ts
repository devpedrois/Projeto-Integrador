import { describe, expect, it } from "vitest";
import { normalizarEmail } from "../../src/services/usuario.service.js";

describe("normalizarEmail", () => {
  it("lowercases the address", () => {
    expect(normalizarEmail("Maria.Artesa@Origem.TEST")).toBe("maria.artesa@origem.test");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizarEmail("  joao@origem.test \t\n")).toBe("joao@origem.test");
  });

  it("keeps an already normalized address unchanged", () => {
    expect(normalizarEmail("ana@origem.test")).toBe("ana@origem.test");
  });
});

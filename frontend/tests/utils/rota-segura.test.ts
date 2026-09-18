import { describe, expect, it } from "vitest";
import { paraDestinoSeguro } from "@/utils/rota-segura";

describe("paraDestinoSeguro", () => {
  it("aceita caminho interno simples", () => {
    expect(paraDestinoSeguro("/painel-artesao")).toBe("/painel-artesao");
  });

  it("aceita caminho interno com query string", () => {
    expect(paraDestinoSeguro("/admin?tab=produtos")).toBe("/admin?tab=produtos");
  });

  it("rejeita destino vazio ou ausente", () => {
    expect(paraDestinoSeguro("")).toBe("/");
    expect(paraDestinoSeguro(null)).toBe("/");
    expect(paraDestinoSeguro(undefined)).toBe("/");
  });

  it("rejeita caminho protocolo-relativo", () => {
    expect(paraDestinoSeguro("//evil.test")).toBe("/");
  });

  it("rejeita URL absoluta externa", () => {
    expect(paraDestinoSeguro("https://evil.test")).toBe("/");
  });

  it("rejeita esquema nao http", () => {
    expect(paraDestinoSeguro("javascript:alert(1)")).toBe("/");
  });

  it("rejeita caminho que nao comeca com barra", () => {
    expect(paraDestinoSeguro("admin")).toBe("/");
  });
});

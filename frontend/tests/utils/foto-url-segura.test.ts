import { describe, expect, it } from "vitest";
import { fotoUrlAceita, fotoUrlSegura } from "@/utils/foto-url-segura";

describe("fotoUrlSegura", () => {
  it("aceita caminho local", () => {
    expect(fotoUrlSegura("/imagens/vaso.jpg")).toBe("/imagens/vaso.jpg");
  });

  it("aceita URL https", () => {
    expect(fotoUrlSegura("https://cdn.exemplo.com/a.jpg")).toBe("https://cdn.exemplo.com/a.jpg");
  });

  it("rejeita valor ausente", () => {
    expect(fotoUrlSegura(undefined)).toBeNull();
    expect(fotoUrlSegura("")).toBeNull();
  });

  it("rejeita caminhos que escapam da origem", () => {
    expect(fotoUrlSegura("/\\evil.com/a.jpg")).toBeNull();
    expect(fotoUrlSegura("/%5Cevil.com/a.jpg")).toBeNull();
    expect(fotoUrlSegura("/produto\\a.jpg")).toBeNull();
  });

  it("rejeita URL http", () => {
    expect(fotoUrlSegura("http://cdn.exemplo.com/a.jpg")).toBeNull();
  });

  it("rejeita esquemas perigosos", () => {
    expect(fotoUrlSegura("javascript:alert(1)")).toBeNull();
    expect(fotoUrlSegura("data:image/svg+xml,<svg/>")).toBeNull();
  });
});

describe("fotoUrlAceita", () => {
  it("aceita https e caminho local", () => {
    expect(fotoUrlAceita("https://cdn.exemplo.com/a.jpg")).toBe(true);
    expect(fotoUrlAceita("/fotos/a.jpg")).toBe(true);
  });

  it("rejeita http, esquemas e caminhos inseguros", () => {
    expect(fotoUrlAceita("http://cdn.exemplo.com/a.jpg")).toBe(false);
    expect(fotoUrlAceita("javascript:alert(1)")).toBe(false);
    expect(fotoUrlAceita("//evil.com/a.jpg")).toBe(false);
    expect(fotoUrlAceita("")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { caminhoLocalSeguro, paraDestinoSeguro } from "@/utils/rota-segura";

describe("paraDestinoSeguro", () => {
  it("aceita caminho interno simples", () => {
    expect(paraDestinoSeguro("/painel-artesao")).toBe("/painel-artesao");
  });

  it("aceita caminho interno de produto", () => {
    expect(paraDestinoSeguro("/produto/1")).toBe("/produto/1");
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
    expect(paraDestinoSeguro("//evil.com")).toBe("/");
  });

  it("rejeita barra invertida logo apos a barra inicial", () => {
    expect(paraDestinoSeguro("/\\evil.com")).toBe("/");
    expect(paraDestinoSeguro("/\\\\evil.com")).toBe("/");
  });

  it("rejeita barra invertida em qualquer posicao", () => {
    expect(paraDestinoSeguro("/produto\\1")).toBe("/");
  });

  it("rejeita barra invertida codificada", () => {
    expect(paraDestinoSeguro("/%5Cevil.com")).toBe("/");
    expect(paraDestinoSeguro("/%5cevil.com")).toBe("/");
  });

  it("rejeita barra dupla codificada", () => {
    expect(paraDestinoSeguro("/%2Fevil.com")).toBe("/");
  });

  it("rejeita codificacao malformada", () => {
    expect(paraDestinoSeguro("/%E0%A4%A")).toBe("/");
  });

  it("rejeita caracteres de controle", () => {
    expect(paraDestinoSeguro("/\t/evil.com")).toBe("/");
    expect(paraDestinoSeguro("/produto\n1")).toBe("/");
    expect(paraDestinoSeguro("/produto\u007F")).toBe("/");
    expect(paraDestinoSeguro("/%09/evil.com")).toBe("/");
  });

  it("rejeita URL absoluta externa", () => {
    expect(paraDestinoSeguro("https://evil.com")).toBe("/");
  });

  it("rejeita esquema javascript", () => {
    expect(paraDestinoSeguro("javascript:alert(1)")).toBe("/");
  });

  it("rejeita esquema embutido no caminho", () => {
    expect(paraDestinoSeguro("/redirect?to=https://evil.com")).toBe("/");
  });

  it("rejeita caminho que nao comeca com barra", () => {
    expect(paraDestinoSeguro("admin")).toBe("/");
  });
});

describe("caminhoLocalSeguro", () => {
  it("aceita caminho local", () => {
    expect(caminhoLocalSeguro("/imagens/vaso.jpg")).toBe(true);
  });

  it("aceita a raiz", () => {
    expect(caminhoLocalSeguro("/")).toBe(true);
  });

  it("rejeita caminhos que escapam da origem", () => {
    expect(caminhoLocalSeguro("//evil.com")).toBe(false);
    expect(caminhoLocalSeguro("/\\evil.com")).toBe(false);
    expect(caminhoLocalSeguro("/%5Cevil.com")).toBe(false);
    expect(caminhoLocalSeguro("javascript:alert(1)")).toBe(false);
  });
});

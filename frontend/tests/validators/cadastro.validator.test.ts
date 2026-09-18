import { describe, expect, it } from "vitest";
import { cadastroValido, validarCadastro } from "@/validators/cadastro.validator";
import type { CadastroInput } from "@/types/cadastro";

function cadastroBase(): CadastroInput {
  return {
    nome: "Maria Artesa",
    email: "maria@origem.test",
    senha: "senha1234",
    papel: "comprador",
  };
}

describe("validarCadastro", () => {
  it("nao retorna erros para um cadastro valido", () => {
    const erros = validarCadastro(cadastroBase());

    expect(erros).toEqual({});
    expect(cadastroValido(erros)).toBe(true);
  });

  it("rejeita nome com menos de 3 caracteres", () => {
    const erros = validarCadastro({ ...cadastroBase(), nome: "Ma" });

    expect(erros.nome).toBeDefined();
    expect(cadastroValido(erros)).toBe(false);
  });

  it("rejeita email em formato invalido", () => {
    const erros = validarCadastro({ ...cadastroBase(), email: "email-invalido" });

    expect(erros.email).toBeDefined();
  });

  it("rejeita senha com menos de oito caracteres", () => {
    const erros = validarCadastro({ ...cadastroBase(), senha: "curta12" });

    expect(erros.senha).toBeDefined();
  });

  it("aceita senha com exatamente oito caracteres", () => {
    const erros = validarCadastro({ ...cadastroBase(), senha: "12345678" });

    expect(erros.senha).toBeUndefined();
  });

  it("aceita papel artesao", () => {
    const erros = validarCadastro({ ...cadastroBase(), papel: "artesao" });

    expect(erros.papel).toBeUndefined();
  });

  it("rejeita papel admin mesmo forcado via cast", () => {
    const entrada = { ...cadastroBase(), papel: "admin" } as unknown as CadastroInput;

    const erros = validarCadastro(entrada);

    expect(erros.papel).toBeDefined();
  });

  it("rejeita papel vazio ou desconhecido", () => {
    const entrada = { ...cadastroBase(), papel: "" } as unknown as CadastroInput;

    const erros = validarCadastro(entrada);

    expect(erros.papel).toBeDefined();
  });
});

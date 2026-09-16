import type { CadastroInput } from "@/types/cadastro";

export type CampoCadastro = keyof CadastroInput;

export type ErrosCadastro = Partial<Record<CampoCadastro, string>>;

const PAPEIS_PERMITIDOS = ["comprador", "artesao"] as const;

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarCadastro(input: CadastroInput): ErrosCadastro {
  const erros: ErrosCadastro = {};

  if (input.nome.trim().length < 3) {
    erros.nome = "Informe um nome com ao menos 3 caracteres.";
  }

  if (!REGEX_EMAIL.test(input.email.trim())) {
    erros.email = "Informe um email valido.";
  }

  if (input.senha.length < 8) {
    erros.senha = "A senha precisa ter ao menos oito caracteres.";
  }

  if (
    !PAPEIS_PERMITIDOS.includes(
      input.papel as (typeof PAPEIS_PERMITIDOS)[number]
    )
  ) {
    erros.papel = "Selecione comprador ou artesao.";
  }

  return erros;
}

export function cadastroValido(erros: ErrosCadastro): boolean {
  return Object.keys(erros).length === 0;
}

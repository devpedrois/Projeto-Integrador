import type { LoginInput } from "@/types/login";

export type CampoLogin = keyof LoginInput;

export type ErrosLogin = Partial<Record<CampoLogin, string>>;

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarLogin(input: LoginInput): ErrosLogin {
  const erros: ErrosLogin = {};

  if (!REGEX_EMAIL.test(input.email.trim())) {
    erros.email = "Informe um email valido.";
  }

  if (input.senha.length === 0) {
    erros.senha = "Informe a senha.";
  }

  return erros;
}

export function loginValido(erros: ErrosLogin): boolean {
  return Object.keys(erros).length === 0;
}

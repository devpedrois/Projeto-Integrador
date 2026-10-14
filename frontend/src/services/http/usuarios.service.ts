import type { UsuariosSessaoService } from "@/services/contracts/usuarios.contract";
import { ServiceError } from "@/services/errors";
import { ApiClient } from "@/services/http/api-client";
import type { CadastroInput } from "@/types/cadastro";
import type { LoginInput } from "@/types/login";
import type { UsuarioPublico, Papel } from "@/types/usuario";
import type { UsuarioSessao } from "@/types/sessao";
import { validarCadastro } from "@/validators/cadastro.validator";
import { validarLogin } from "@/validators/login.validator";

function sessaoPublica(value: unknown): UsuarioSessao {
  if (typeof value !== "object" || value === null)
    throw new ServiceError(
      "RESPOSTA_INVALIDA",
      "Resposta de autenticação inválida.",
    );
  const { id, nome, email, papel } = value as Record<string, unknown>;
  if (
    typeof id !== "string" ||
    !id.trim() ||
    typeof nome !== "string" ||
    !nome.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof papel !== "string" ||
    !["comprador", "artesao", "admin"].includes(papel)
  ) {
    throw new ServiceError(
      "RESPOSTA_INVALIDA",
      "Resposta de autenticação inválida.",
    );
  }
  return { id, nome, email, papel: papel as Papel };
}

function credenciaisValidas(input: LoginInput): boolean {
  return (
    typeof input?.email === "string" &&
    typeof input?.senha === "string" &&
    input.email.trim().length <= 254 &&
    new TextEncoder().encode(input.senha).length <= 72 &&
    Object.keys(validarLogin(input)).length === 0
  );
}

export class HttpUsuariosService implements UsuariosSessaoService {
  constructor(private readonly api = new ApiClient()) {}

  async list(): Promise<UsuarioPublico[]> {
    throw new ServiceError(
      "HTTP_NAO_IMPLEMENTADO",
      "Listagem de usuários ainda indisponível.",
    );
  }

  async register(input: CadastroInput): Promise<UsuarioPublico> {
    if (!["comprador", "artesao"].includes(input?.papel))
      throw new ServiceError(
        "PAPEL_INVALIDO",
        "Selecione comprador ou artesão.",
      );
    if (
      !credenciaisValidas(input) ||
      typeof input?.nome !== "string" ||
      input.nome.trim().length > 120 ||
      Object.keys(validarCadastro(input)).length > 0
    )
      throw new ServiceError(
        "CADASTRO_INVALIDO",
        "Dados de cadastro inválidos.",
      );
    const result = await this.api.request<unknown>("/auth/register", {
      method: "POST",
      body: {
        nome: input.nome.trim(),
        email: input.email.trim().toLowerCase(),
        senha: input.senha,
        papel: input.papel,
      },
    });
    return { ...sessaoPublica(result), ativo: true };
  }

  async login(input: LoginInput): Promise<UsuarioSessao> {
    if (!credenciaisValidas(input))
      throw new ServiceError(
        "CREDENCIAIS_INVALIDAS",
        "Email ou senha inválidos.",
      );
    return sessaoPublica(
      await this.api.request<unknown>("/auth/login", {
        method: "POST",
        body: { email: input.email.trim().toLowerCase(), senha: input.senha },
      }),
    );
  }

  async me(): Promise<UsuarioSessao> {
    return sessaoPublica(await this.api.request<unknown>("/auth/me"));
  }
  async logout(): Promise<void> {
    await this.api.request<void>("/auth/logout", { method: "POST" });
  }
}

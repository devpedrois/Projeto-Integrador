import type { UsuariosSessaoService } from "@/services/contracts/usuarios.contract";
import { ServiceError } from "@/services/errors";
import { ApiClient } from "@/services/http/api-client";
import { HttpPerfilArtesaoService } from "@/services/http/perfil-artesao.service";
import type { CadastroInput } from "@/types/cadastro";
import type { LoginInput } from "@/types/login";
import type {
  UsuarioPublico,
  UsuarioResumoPublico,
  Papel,
} from "@/types/usuario";
import type { UsuarioSessao } from "@/types/sessao";
import { validarCadastro } from "@/validators/cadastro.validator";
import { validarLogin } from "@/validators/login.validator";
import { objeto, respostaInvalida } from "./catalogo-response";

const INTERVALOS_RECUPERACAO_SESSAO_MS = [1000, 2000, 4000] as const;
const ERROS_TRANSITORIOS_SESSAO = new Set([
  "TIMEOUT",
  "ERRO_REDE",
  "SERVICO_INDISPONIVEL",
]);

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

  async obterNomeArtesao(artesaoId: string): Promise<string | null> {
    return (
      (await new HttpPerfilArtesaoService(this.api).obter(artesaoId))?.nome ??
      null
    );
  }

  async list(): Promise<UsuarioResumoPublico[]> {
    const value = await this.api.request<unknown>("/artesaos");
    if (!Array.isArray(value)) return respostaInvalida();
    return value.map((artesao) => {
      if (
        !objeto(artesao) ||
        typeof artesao.id !== "string" ||
        !artesao.id.trim() ||
        typeof artesao.nome !== "string" ||
        !artesao.nome.trim() ||
        artesao.papel !== "artesao" ||
        artesao.ativo !== true
      )
        return respostaInvalida();
      return {
        id: artesao.id,
        nome: artesao.nome,
        papel: "artesao",
        ativo: true,
      };
    });
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
    let tentativa = 0;
    for (;;) {
      try {
        return sessaoPublica(await this.api.request<unknown>("/auth/me"));
      } catch (error: unknown) {
        const intervalo = INTERVALOS_RECUPERACAO_SESSAO_MS[tentativa];
        if (
          intervalo === undefined ||
          !(error instanceof ServiceError) ||
          !ERROS_TRANSITORIOS_SESSAO.has(error.code)
        )
          throw error;
        tentativa += 1;
        await new Promise<void>((resolve) => setTimeout(resolve, intervalo));
      }
    }
  }
  async logout(): Promise<void> {
    await this.api.request<void>("/auth/logout", { method: "POST" });
  }
}

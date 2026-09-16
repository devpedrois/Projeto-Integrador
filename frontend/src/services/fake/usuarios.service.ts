import {
  EmailJaCadastradoError,
  normalizarEmail,
  type UsuarioRepository,
} from "@/fake-api/repositories/usuario.repository";
import { paraUsuarioPublico, type UsuarioPublico } from "@/types/usuario";
import type { CadastroInput } from "@/types/cadastro";
import type { LoginInput } from "@/types/login";
import type { UsuarioSessao } from "@/types/sessao";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import { ServiceError } from "@/services/errors";
import { validarCadastro } from "@/validators/cadastro.validator";

const MENSAGEM_CREDENCIAIS_INVALIDAS = "Email ou senha invalidos.";

export interface FakeUsuariosServiceOpcoes {
  latenciaMs?: number;
}

function aguardar(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class FakeUsuariosService implements UsuariosService {
  private readonly latenciaMs: number;

  constructor(
    private readonly repositorio: UsuarioRepository,
    opcoes: FakeUsuariosServiceOpcoes = {}
  ) {
    this.latenciaMs = opcoes.latenciaMs ?? 0;
  }

  async list(): Promise<UsuarioPublico[]> {
    await this.repositorio.seed();
    await aguardar(this.latenciaMs);
    const usuarios = await this.repositorio.list();
    return usuarios.map(paraUsuarioPublico);
  }

  async register(input: CadastroInput): Promise<UsuarioPublico> {
    const erros = validarCadastro(input);
    if (erros.papel) {
      throw new ServiceError("PAPEL_INVALIDO", erros.papel);
    }
    if (Object.keys(erros).length > 0) {
      throw new ServiceError("CADASTRO_INVALIDO", "Dados de cadastro invalidos.");
    }

    await this.repositorio.seed();
    await aguardar(this.latenciaMs);
    try {
      const criado = await this.repositorio.create({
        id: crypto.randomUUID(),
        nome: input.nome.trim(),
        email: input.email.trim(),
        senha: input.senha,
        papel: input.papel,
        ativo: true,
      });
      return paraUsuarioPublico(criado);
    } catch (erro) {
      if (erro instanceof EmailJaCadastradoError) {
        throw new ServiceError("EMAIL_JA_CADASTRADO", erro.message);
      }
      throw erro;
    }
  }

  async login(input: LoginInput): Promise<UsuarioSessao> {
    await this.repositorio.seed();
    await aguardar(this.latenciaMs);

    const emailNormalizado = normalizarEmail(input.email);
    const usuarios = await this.repositorio.list();
    const encontrado = usuarios.find(
      (usuario) => normalizarEmail(usuario.email) === emailNormalizado
    );

    if (!encontrado || encontrado.senha !== input.senha || !encontrado.ativo) {
      throw new ServiceError(
        "CREDENCIAIS_INVALIDAS",
        MENSAGEM_CREDENCIAIS_INVALIDAS
      );
    }

    return { id: encontrado.id, nome: encontrado.nome, papel: encontrado.papel };
  }
}

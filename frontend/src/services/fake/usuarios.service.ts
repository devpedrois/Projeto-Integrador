import type { UsuarioRepository } from "@/fake-api/repositories/usuario.repository";
import { paraUsuarioPublico, type UsuarioPublico } from "@/types/usuario";
import type { CadastroInput } from "@/types/cadastro";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import { ServiceError } from "@/services/errors";
import { validarCadastro } from "@/validators/cadastro.validator";

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
    const criado = await this.repositorio.create({
      id: crypto.randomUUID(),
      nome: input.nome.trim(),
      email: input.email.trim(),
      senha: input.senha,
      papel: input.papel,
      ativo: true,
    });
    return paraUsuarioPublico(criado);
  }
}

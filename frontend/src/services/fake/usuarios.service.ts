import type { UsuarioRepository } from "@/fake-api/repositories/usuario.repository";
import { paraUsuarioPublico, type UsuarioPublico } from "@/types/usuario";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";

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
}

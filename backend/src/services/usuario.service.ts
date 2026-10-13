import type {
  NovoUsuario,
  UsuarioCriado,
  UsuarioRepository,
} from "../repositories/usuario.repository.js";

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class UsuarioService {
  public constructor(private readonly repository: UsuarioRepository) {}

  public async criar(usuario: NovoUsuario): Promise<UsuarioCriado> {
    return this.repository.criar({ ...usuario, email: normalizarEmail(usuario.email) });
  }
}

import type {
  NovoUsuario,
  UsuarioCriado,
  UsuarioRepository,
} from "../repositories/usuario.repository.js";
import { AppError } from "../errors/app-error.js";

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class UsuarioService {
  public constructor(private readonly repository: UsuarioRepository) {}

  public async criar(usuario: NovoUsuario): Promise<UsuarioCriado> {
    return this.repository.criar({
      ...usuario,
      email: normalizarEmail(usuario.email),
    });
  }

  public async alterarPapel(
    usuarioId: string,
    papel: "comprador" | "artesao",
    adminId: string,
  ): Promise<UsuarioCriado> {
    if (usuarioId === adminId) {
      throw new AppError(
        403,
        "ACESSO_NEGADO",
        "Admin nao pode alterar o proprio papel.",
      );
    }
    return this.repository.alterarPapel(usuarioId, papel);
  }
}

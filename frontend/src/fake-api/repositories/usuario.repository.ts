import type { Usuario } from "@/types/usuario";
import { USUARIOS_SEED } from "@/fake-api/seeds/usuarios.seed";

const CHAVE_PADRAO = "origem:v1:usuarios";

export class EmailJaCadastradoError extends Error {
  public readonly code = "EMAIL_JA_CADASTRADO";

  constructor() {
    super("Este email ja esta cadastrado.");
    this.name = "EmailJaCadastradoError";
  }
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface UsuarioRepository {
  seed(): Promise<void>;
  list(): Promise<Usuario[]>;
  create(usuario: Usuario): Promise<Usuario>;
}

export class BrowserUsuarioRepository implements UsuarioRepository {
  constructor(
    private readonly storage: Storage,
    private readonly chave: string = CHAVE_PADRAO
  ) {}

  async seed(): Promise<void> {
    if (this.storage.getItem(this.chave) !== null) return;
    this.storage.setItem(this.chave, JSON.stringify(USUARIOS_SEED));
  }

  async list(): Promise<Usuario[]> {
    const bruto = this.storage.getItem(this.chave);
    if (bruto === null) return [];
    return JSON.parse(bruto) as Usuario[];
  }

  async create(usuario: Usuario): Promise<Usuario> {
    const emailNormalizado = normalizarEmail(usuario.email);
    const usuarios = await this.list();

    if (usuarios.some((u) => normalizarEmail(u.email) === emailNormalizado)) {
      throw new EmailJaCadastradoError();
    }

    const usuarioNormalizado: Usuario = { ...usuario, email: emailNormalizado };
    usuarios.push(usuarioNormalizado);
    this.storage.setItem(this.chave, JSON.stringify(usuarios));
    return usuarioNormalizado;
  }
}

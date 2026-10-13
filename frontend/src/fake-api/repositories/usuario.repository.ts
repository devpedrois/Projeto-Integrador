import type { Usuario } from "@/types/usuario";
import { USUARIOS_SEED } from "@/fake-api/seeds/usuarios.seed";
import { lerListaPersistida } from "@/fake-api/storage/lista-persistida";

const CHAVE_PADRAO = "origem:v1:usuarios";

export class EmailJaCadastradoError extends Error {
  public readonly code = "EMAIL_JA_CADASTRADO";

  constructor() {
    super("Este email já está cadastrado.");
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
  update(
    id: string,
    alteracoes: Partial<Omit<Usuario, "id" | "email" | "senha" | "papel">>
  ): Promise<Usuario | null>;
}

export class BrowserUsuarioRepository implements UsuarioRepository {
  constructor(
    private readonly storage: Storage,
    private readonly chave: string = CHAVE_PADRAO
  ) {}

  async seed(): Promise<void> {
    if (lerListaPersistida(this.storage, this.chave) !== null) return;
    this.storage.setItem(this.chave, JSON.stringify(USUARIOS_SEED));
  }

  async list(): Promise<Usuario[]> {
    return lerListaPersistida<Usuario>(this.storage, this.chave) ?? [];
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

  async update(
    id: string,
    alteracoes: Partial<Omit<Usuario, "id" | "email" | "senha" | "papel">>
  ): Promise<Usuario | null> {
    const usuarios = await this.list();
    const indice = usuarios.findIndex((usuario) => usuario.id === id);
    if (indice === -1) return null;

    const atual = usuarios[indice] as Usuario;
    const atualizado: Usuario = {
      ...atual,
      ...alteracoes,
      id: atual.id,
      email: atual.email,
      senha: atual.senha,
      papel: atual.papel,
    };
    usuarios[indice] = atualizado;
    this.storage.setItem(this.chave, JSON.stringify(usuarios));
    return atualizado;
  }
}

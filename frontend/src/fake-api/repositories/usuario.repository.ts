import type { Usuario } from "@/types/usuario";
import { USUARIOS_SEED } from "@/fake-api/seeds/usuarios.seed";

const CHAVE_PADRAO = "origem:v1:usuarios";

export interface UsuarioRepository {
  seed(): Promise<void>;
  list(): Promise<Usuario[]>;
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
}

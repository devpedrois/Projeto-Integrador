import type { UsuarioSessao } from "@/types/sessao";

const CHAVE_PADRAO = "origem:v1:sessao";

export interface SessaoStorage {
  ler(): UsuarioSessao | null;
  salvar(sessao: UsuarioSessao): void;
  limpar(): void;
}

export class BrowserSessaoStorage implements SessaoStorage {
  constructor(
    private readonly storage: Storage,
    private readonly chave: string = CHAVE_PADRAO
  ) {}

  ler(): UsuarioSessao | null {
    const bruto = this.storage.getItem(this.chave);
    if (bruto === null) return null;
    try {
      return JSON.parse(bruto) as UsuarioSessao;
    } catch {
      return null;
    }
  }

  salvar(sessao: UsuarioSessao): void {
    const { id, nome, papel } = sessao;
    this.storage.setItem(this.chave, JSON.stringify({ id, nome, papel }));
  }

  limpar(): void {
    this.storage.removeItem(this.chave);
  }
}

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
      const sessao = JSON.parse(bruto) as Partial<UsuarioSessao>;
      return typeof sessao.email === "string" ? (sessao as UsuarioSessao) : null;
    } catch {
      return null;
    }
  }

  salvar(sessao: UsuarioSessao): void {
    const { id, nome, email, papel } = sessao;
    this.storage.setItem(this.chave, JSON.stringify({ id, nome, email, papel }));
  }

  limpar(): void {
    this.storage.removeItem(this.chave);
  }
}

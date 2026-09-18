import type { SessaoStorage } from "@/fake-api/storage/sessao.storage";
import type { UsuarioSessao } from "@/types/sessao";

type Ouvinte = () => void;

export class SessionStore {
  private sessao: UsuarioSessao | null;
  private readonly ouvintes = new Set<Ouvinte>();

  constructor(private readonly storage: SessaoStorage) {
    this.sessao = this.storage.ler();
  }

  getSnapshot = (): UsuarioSessao | null => this.sessao;

  subscribe = (ouvinte: Ouvinte): (() => void) => {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  };

  login(sessao: UsuarioSessao): void {
    this.sessao = sessao;
    this.storage.salvar(sessao);
    this.notificar();
  }

  logout(): void {
    this.sessao = null;
    this.storage.limpar();
    this.notificar();
  }

  private notificar(): void {
    for (const ouvinte of this.ouvintes) ouvinte();
  }
}

import type { SessaoStorage } from "@/fake-api/storage/sessao.storage";
import type { UsuarioSessao } from "@/types/sessao";
import type { UsuariosSessaoService } from "@/services/contracts/usuarios.contract";
import { ServiceError } from "@/services/errors";

type Ouvinte = () => void;
export type VerificadorUsuarioAtivo = (
  sessao: UsuarioSessao,
) => Promise<boolean>;

export class SessionStore {
  private sessao: UsuarioSessao | null;
  private readonly ouvintes = new Set<Ouvinte>();
  private restaurando: boolean;
  private erro: ServiceError | null = null;
  private versao = 0;
  private hidratacao: Promise<void> | null = null;

  constructor(
    private readonly storage: SessaoStorage | null,
    private readonly remoto?: Pick<UsuariosSessaoService, "me" | "logout">,
  ) {
    this.sessao = remoto ? null : (storage?.ler() ?? null);
    this.restaurando = remoto !== undefined;
  }

  getSnapshot = (): UsuarioSessao | null => this.sessao;
  getRestaurandoSnapshot = (): boolean => this.restaurando;
  getErroSnapshot = (): ServiceError | null => this.erro;

  hidratar(): Promise<void> {
    if (!this.remoto) return Promise.resolve();
    if (this.hidratacao) return this.hidratacao;
    const versao = this.versao;
    this.restaurando = true;
    this.erro = null;
    this.notificar();
    this.hidratacao = this.remoto
      .me()
      .then((sessao) => {
        if (versao === this.versao) this.sessao = sessao;
      })
      .catch((error: unknown) => {
        if (versao !== this.versao) return;
        this.sessao = null;
        this.erro =
          error instanceof ServiceError && error.code === "NAO_AUTENTICADO"
            ? null
            : error instanceof ServiceError
              ? error
              : new ServiceError(
                  "SERVICO_INDISPONIVEL",
                  "Não foi possível conferir sua sessão.",
                );
      })
      .finally(() => {
        this.hidratacao = null;
        if (versao === this.versao) {
          this.restaurando = false;
          this.notificar();
        }
      });
    return this.hidratacao;
  }

  subscribe = (ouvinte: Ouvinte): (() => void) => {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  };

  login(sessao: UsuarioSessao): void {
    this.versao += 1;
    this.sessao = sessao;
    this.restaurando = false;
    this.erro = null;
    if (!this.remoto) this.storage?.salvar(sessao);
    this.notificar();
  }

  logout(): void | Promise<void> {
    this.versao += 1;
    if (this.remoto) return this.remoto.logout().then(() => this.encerrar());
    this.encerrar();
  }

  private encerrar(): void {
    this.sessao = null;
    this.restaurando = false;
    this.erro = null;
    if (!this.remoto) this.storage?.limpar();
    this.notificar();
  }

  async revalidar(verificarAtivo: VerificadorUsuarioAtivo): Promise<void> {
    const sessaoVerificada = this.sessao;
    if (!sessaoVerificada) return;
    const valida = await verificarAtivo(sessaoVerificada).catch(() => false);
    if (!valida && this.sessao === sessaoVerificada) this.logout();
  }

  private notificar(): void {
    for (const ouvinte of this.ouvintes) ouvinte();
  }
}

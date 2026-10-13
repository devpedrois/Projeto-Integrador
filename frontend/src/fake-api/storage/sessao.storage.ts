import type { UsuarioSessao } from "@/types/sessao";
import type { Papel } from "@/types/usuario";

const CHAVE_PADRAO = "origem:v1:sessao";
const PAPEIS_VALIDOS: readonly Papel[] = ["comprador", "artesao", "admin"];

function textoPreenchido(valor: unknown): valor is string {
  return typeof valor === "string" && valor.length > 0;
}

function paraSessaoValida(valor: unknown): UsuarioSessao | null {
  if (typeof valor !== "object" || valor === null) return null;
  const { id, nome, email, papel } = valor as Record<string, unknown>;
  if (!textoPreenchido(id) || !textoPreenchido(email)) return null;
  if (!PAPEIS_VALIDOS.includes(papel as Papel)) return null;
  return { id, nome: typeof nome === "string" ? nome : "", email, papel: papel as Papel };
}

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
    const sessao = this.interpretar(bruto);
    if (sessao === null) this.limpar();
    return sessao;
  }

  salvar(sessao: UsuarioSessao): void {
    const { id, nome, email, papel } = sessao;
    this.storage.setItem(this.chave, JSON.stringify({ id, nome, email, papel }));
  }

  limpar(): void {
    this.storage.removeItem(this.chave);
  }

  private interpretar(bruto: string): UsuarioSessao | null {
    try {
      return paraSessaoValida(JSON.parse(bruto));
    } catch {
      return null;
    }
  }
}

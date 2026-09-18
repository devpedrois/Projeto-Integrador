import type { Carrinho } from "@/types/carrinho";

const PREFIXO_PADRAO = "origem:v1:carrinho";

export interface CarrinhoStorage {
  ler(): Carrinho | null;
  salvar(carrinho: Carrinho): void;
  limpar(): void;
}

export class BrowserCarrinhoStorage implements CarrinhoStorage {
  private readonly chave: string;

  constructor(
    private readonly storage: Storage,
    usuarioId: string,
    prefixo: string = PREFIXO_PADRAO
  ) {
    this.chave = `${prefixo}:${usuarioId}`;
  }

  ler(): Carrinho | null {
    const bruto = this.storage.getItem(this.chave);
    if (bruto === null) return null;
    try {
      return JSON.parse(bruto) as Carrinho;
    } catch {
      return null;
    }
  }

  salvar(carrinho: Carrinho): void {
    this.storage.setItem(this.chave, JSON.stringify(carrinho));
  }

  limpar(): void {
    this.storage.removeItem(this.chave);
  }
}

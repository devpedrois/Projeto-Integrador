import type { Carrinho } from "@/types/carrinho";

const PREFIXO_PADRAO = "origem:v1:carrinho";

function interpretarCarrinho(bruto: string): Carrinho | null {
  try {
    const valor: unknown = JSON.parse(bruto);
    if (typeof valor !== "object" || valor === null || Array.isArray(valor)) return null;
    return Array.isArray((valor as Carrinho).itens) ? (valor as Carrinho) : null;
  } catch {
    return null;
  }
}

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
    const carrinho = interpretarCarrinho(bruto);
    if (carrinho === null) this.limpar();
    return carrinho;
  }

  salvar(carrinho: Carrinho): void {
    this.storage.setItem(this.chave, JSON.stringify(carrinho));
  }

  limpar(): void {
    this.storage.removeItem(this.chave);
  }
}

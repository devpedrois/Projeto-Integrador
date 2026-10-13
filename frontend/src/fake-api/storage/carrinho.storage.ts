import type { Carrinho } from "@/types/carrinho";
import { ehObjeto } from "@/fake-api/storage/lista-persistida";

const PREFIXO_PADRAO = "origem:v1:carrinho";

function interpretarCarrinho(bruto: string): Carrinho | null {
  try {
    const valor: unknown = JSON.parse(bruto);
    if (!ehObjeto(valor)) return null;
    const { itens } = valor as Carrinho;
    if (!Array.isArray(itens)) return null;
    return { ...(valor as Carrinho), itens: itens.filter(ehObjeto) };
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

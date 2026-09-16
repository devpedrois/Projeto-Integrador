import type { Produto } from "@/types/produto";
import { PRODUTOS_SEED } from "@/fake-api/seeds/produtos.seed";

const CHAVE_PADRAO = "origem:v1:produtos";

export interface ProdutoRepository {
  seed(): Promise<void>;
  list(): Promise<Produto[]>;
}

export class BrowserProdutoRepository implements ProdutoRepository {
  constructor(
    private readonly storage: Storage,
    private readonly chave: string = CHAVE_PADRAO
  ) {}

  async seed(): Promise<void> {
    if (this.storage.getItem(this.chave) !== null) return;
    this.storage.setItem(this.chave, JSON.stringify(PRODUTOS_SEED));
  }

  async list(): Promise<Produto[]> {
    const bruto = this.storage.getItem(this.chave);
    if (bruto === null) return [];
    return JSON.parse(bruto) as Produto[];
  }
}

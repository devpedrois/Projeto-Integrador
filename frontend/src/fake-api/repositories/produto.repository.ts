import type { Produto } from "@/types/produto";
import { PRODUTOS_SEED } from "@/fake-api/seeds/produtos.seed";

const CHAVE_PADRAO = "origem:v1:produtos";

export interface ProdutoRepository {
  seed(): Promise<void>;
  list(): Promise<Produto[]>;
  create(produto: Produto): Promise<Produto>;
  findById(id: string): Promise<Produto | null>;
  update(
    id: string,
    alteracoes: Partial<Omit<Produto, "id" | "artesaoId">>
  ): Promise<Produto | null>;
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

  async create(produto: Produto): Promise<Produto> {
    const produtos = await this.list();
    produtos.push(produto);
    this.storage.setItem(this.chave, JSON.stringify(produtos));
    return produto;
  }

  async findById(id: string): Promise<Produto | null> {
    const produtos = await this.list();
    return produtos.find((produto) => produto.id === id) ?? null;
  }

  async update(
    id: string,
    alteracoes: Partial<Omit<Produto, "id" | "artesaoId">>
  ): Promise<Produto | null> {
    const produtos = await this.list();
    const indice = produtos.findIndex((produto) => produto.id === id);
    if (indice === -1) return null;

    const atual = produtos[indice] as Produto;
    const atualizado: Produto = { ...atual, ...alteracoes, id: atual.id, artesaoId: atual.artesaoId };
    produtos[indice] = atualizado;
    this.storage.setItem(this.chave, JSON.stringify(produtos));
    return atualizado;
  }
}

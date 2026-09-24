import type { Avaliacao } from "@/types/avaliacao";
import { AVALIACOES_SEED } from "@/fake-api/seeds/avaliacoes.seed";

const CHAVE_PADRAO = "origem:v1:avaliacoes";

export interface AvaliacaoRepository {
  seed(): Promise<void>;
  list(): Promise<Avaliacao[]>;
  listByProdutoId(produtoId: string): Promise<Avaliacao[]>;
  create(avaliacao: Avaliacao): Promise<Avaliacao>;
}

export class BrowserAvaliacaoRepository implements AvaliacaoRepository {
  constructor(
    private readonly storage: Storage,
    private readonly chave: string = CHAVE_PADRAO
  ) {}

  async seed(): Promise<void> {
    if (this.storage.getItem(this.chave) !== null) return;
    this.storage.setItem(this.chave, JSON.stringify(AVALIACOES_SEED));
  }

  async list(): Promise<Avaliacao[]> {
    const bruto = this.storage.getItem(this.chave);
    if (bruto === null) return [];
    return JSON.parse(bruto) as Avaliacao[];
  }

  async listByProdutoId(produtoId: string): Promise<Avaliacao[]> {
    const avaliacoes = await this.list();
    return avaliacoes.filter((avaliacao) => avaliacao.produtoId === produtoId);
  }

  async create(avaliacao: Avaliacao): Promise<Avaliacao> {
    const avaliacoes = await this.list();
    avaliacoes.push(avaliacao);
    this.storage.setItem(this.chave, JSON.stringify(avaliacoes));
    return avaliacao;
  }
}

import type { ProdutoRepository } from "@/fake-api/repositories/produto.repository";
import type { Produto } from "@/types/produto";
import type { ProdutosService } from "@/services/contracts/produtos.contract";

export interface FakeProdutosServiceOpcoes {
  latenciaMs?: number;
}

function aguardar(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class FakeProdutosService implements ProdutosService {
  private readonly latenciaMs: number;

  constructor(
    private readonly repositorio: ProdutoRepository,
    opcoes: FakeProdutosServiceOpcoes = {}
  ) {
    this.latenciaMs = opcoes.latenciaMs ?? 0;
  }

  async list(): Promise<Produto[]> {
    await this.repositorio.seed();
    await aguardar(this.latenciaMs);
    return this.repositorio.list();
  }
}

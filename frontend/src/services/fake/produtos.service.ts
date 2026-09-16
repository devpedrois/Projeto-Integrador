import type { ProdutoRepository } from "@/fake-api/repositories/produto.repository";
import type { Produto } from "@/types/produto";
import type { NovoProdutoInput } from "@/types/novo-produto";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import { ServiceError } from "@/services/errors";
import { produtoValido, validarProduto } from "@/validators/produto.validator";

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

  async create(input: NovoProdutoInput, artesaoId: string): Promise<Produto> {
    const erros = validarProduto(input);
    if (!produtoValido(erros)) {
      throw new ServiceError("PRODUTO_INVALIDO", "Dados do produto invalidos.");
    }

    await this.repositorio.seed();
    await aguardar(this.latenciaMs);

    const produto: Produto = {
      id: crypto.randomUUID(),
      nome: input.nome.trim(),
      descricao: input.descricao.trim(),
      preco: input.preco,
      categoriaId: input.categoriaId,
      tecnicaId: "",
      regiaoId: "",
      artesaoId,
      fotos: input.fotos.map((foto, indice) => ({
        url: foto.url.trim(),
        ordem: indice,
      })),
      quantidadeEstoque: input.quantidadeEstoque,
      quantidadeVendida: 0,
      notaMedia: 0,
      ativo: true,
      criadoEm: new Date().toISOString(),
    };

    return this.repositorio.create(produto);
  }
}

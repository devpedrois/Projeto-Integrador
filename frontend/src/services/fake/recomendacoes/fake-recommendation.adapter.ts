import type { ProdutoRepository } from "@/fake-api/repositories/produto.repository";
import type { Produto } from "@/types/produto";
import type { RecomendacaoContexto, RecomendacaoResultado } from "@/types/recomendacao";
import type { RecomendacoesService } from "@/services/contracts/recomendacoes.contract";

const LIMITE_ITENS = 8;
const ESTRATEGIA_CATEGORIA = "categoria";
const ESTRATEGIA_FALLBACK = "fallback-geral";

function elegivel(produto: Produto, excluirId: string): boolean {
  return produto.id !== excluirId && produto.ativo && produto.quantidadeEstoque > 0;
}

function compararIdAsc(a: Produto, b: Produto): number {
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

function ordenarPorPopularidade(produtos: Produto[]): Produto[] {
  return [...produtos].sort((a, b) => {
    if (b.quantidadeVendida !== a.quantidadeVendida) {
      return b.quantidadeVendida - a.quantidadeVendida;
    }
    if (b.notaMedia !== a.notaMedia) return b.notaMedia - a.notaMedia;
    return compararIdAsc(a, b);
  });
}

function ordenarPorCategoriaERegiao(
  produtos: Produto[],
  produtoContexto: Produto
): Produto[] {
  return [...produtos].sort((a, b) => {
    const regiaoA = a.regiaoId === produtoContexto.regiaoId ? 0 : 1;
    const regiaoB = b.regiaoId === produtoContexto.regiaoId ? 0 : 1;
    if (regiaoA !== regiaoB) return regiaoA - regiaoB;
    if (b.quantidadeVendida !== a.quantidadeVendida) {
      return b.quantidadeVendida - a.quantidadeVendida;
    }
    if (b.notaMedia !== a.notaMedia) return b.notaMedia - a.notaMedia;
    return compararIdAsc(a, b);
  });
}

/**
 * Adapter local da AV1: consulta o repositorio do navegador e aplica a
 * mesma especificacao de ranking da baseline oficial (RECOMMENDATION.md).
 * Na Avaliacao 2, `HttpRecommendationAdapter` (services/http) substitui esta
 * classe na composicao da aplicacao, chamando `GET /recomendacoes`, sem
 * alterar o contrato `RecomendacoesService`, hooks, componentes ou paginas.
 */
export class FakeRecommendationAdapter implements RecomendacoesService {
  constructor(private readonly repositorio: ProdutoRepository) {}

  async obter(contexto: RecomendacaoContexto): Promise<RecomendacaoResultado> {
    await this.repositorio.seed();
    const produtos = await this.repositorio.list();

    if ("usuarioId" in contexto && contexto.usuarioId !== undefined) {
      return this.fallbackGeral(produtos, null);
    }

    const produtoContexto = produtos.find((produto) => produto.id === contexto.produtoId);
    if (!produtoContexto) {
      return this.fallbackGeral(produtos, contexto.produtoId);
    }

    const candidatos = produtos.filter(
      (produto) =>
        elegivel(produto, produtoContexto.id) &&
        produto.categoriaId === produtoContexto.categoriaId
    );

    if (candidatos.length === 0) {
      return this.fallbackGeral(produtos, produtoContexto.id);
    }

    const ordenados = ordenarPorCategoriaERegiao(candidatos, produtoContexto);

    return {
      estrategia: ESTRATEGIA_CATEGORIA,
      itens: ordenados.slice(0, LIMITE_ITENS),
    };
  }

  private fallbackGeral(
    produtos: Produto[],
    excluirId: string | null
  ): RecomendacaoResultado {
    const candidatos = produtos.filter(
      (produto) => produto.ativo && produto.quantidadeEstoque > 0 && produto.id !== excluirId
    );
    const ordenados = ordenarPorPopularidade(candidatos);

    return {
      estrategia: ESTRATEGIA_FALLBACK,
      itens: ordenados.slice(0, LIMITE_ITENS),
    };
  }
}

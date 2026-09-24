import type { ProdutoRepository } from "@/fake-api/repositories/produto.repository";
import type { UsuarioRepository } from "@/fake-api/repositories/usuario.repository";
import type { Produto } from "@/types/produto";
import type { RecomendacaoContexto, RecomendacaoResultado } from "@/types/recomendacao";
import type { RecomendacoesService } from "@/services/contracts/recomendacoes.contract";
import {
  idsArtesaosInativos,
  produtoVisivelPublicamente,
} from "@/domain/produto-visibilidade";

const LIMITE_ITENS = 8;
const ESTRATEGIA_CATEGORIA = "categoria";
const ESTRATEGIA_FALLBACK = "fallback-geral";

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
  constructor(
    private readonly repositorio: ProdutoRepository,
    private readonly usuarioRepositorio: UsuarioRepository | null = null
  ) {}

  async obter(contexto: RecomendacaoContexto): Promise<RecomendacaoResultado> {
    await this.repositorio.seed();
    const produtos = await this.repositorio.list();
    const artesaosInativos = await this.artesaosInativos();
    const visiveis = produtos.filter((produto) =>
      produtoVisivelPublicamente(produto, artesaosInativos)
    );

    if ("usuarioId" in contexto && contexto.usuarioId !== undefined) {
      return this.fallbackGeral(visiveis, null);
    }

    const produtoContexto = produtos.find((produto) => produto.id === contexto.produtoId);
    if (!produtoContexto) {
      return this.fallbackGeral(visiveis, contexto.produtoId);
    }

    const candidatos = visiveis.filter(
      (produto) =>
        produto.id !== produtoContexto.id &&
        produto.categoriaId === produtoContexto.categoriaId
    );

    if (candidatos.length === 0) {
      return this.fallbackGeral(visiveis, produtoContexto.id);
    }

    const ordenados = ordenarPorCategoriaERegiao(candidatos, produtoContexto);

    return {
      estrategia: ESTRATEGIA_CATEGORIA,
      itens: ordenados.slice(0, LIMITE_ITENS),
    };
  }

  private fallbackGeral(
    visiveis: Produto[],
    excluirId: string | null
  ): RecomendacaoResultado {
    const candidatos = visiveis.filter((produto) => produto.id !== excluirId);
    const ordenados = ordenarPorPopularidade(candidatos);

    return {
      estrategia: ESTRATEGIA_FALLBACK,
      itens: ordenados.slice(0, LIMITE_ITENS),
    };
  }

  private async artesaosInativos(): Promise<Set<string>> {
    if (!this.usuarioRepositorio) return new Set();
    return idsArtesaosInativos(await this.usuarioRepositorio.list());
  }
}

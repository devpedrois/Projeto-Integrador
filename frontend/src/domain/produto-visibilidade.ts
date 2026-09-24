import type { Produto } from "@/types/produto";
import type { Usuario } from "@/types/usuario";

const NENHUM_ARTESAO_INATIVO: ReadonlySet<string> = new Set();

export interface ContextoVisibilidadeProduto {
  usuarioId?: string;
  artesaosInativos?: ReadonlySet<string>;
}

export function produtoDisponivelParaVenda(
  produto: Produto,
  artesaosInativos: ReadonlySet<string> = NENHUM_ARTESAO_INATIVO
): boolean {
  return (
    produto.ativo &&
    produto.desativadoPorAdmin !== true &&
    !artesaosInativos.has(produto.artesaoId)
  );
}

export function produtoVisivelPublicamente(
  produto: Produto,
  artesaosInativos: ReadonlySet<string> = NENHUM_ARTESAO_INATIVO
): boolean {
  return (
    produtoDisponivelParaVenda(produto, artesaosInativos) &&
    produto.quantidadeEstoque > 0
  );
}

export function filtrarProdutosVisiveis(
  produtos: Produto[],
  contexto: ContextoVisibilidadeProduto = {}
): Produto[] {
  return produtos.filter((produto) => {
    const donoVisualizando = contexto.usuarioId === produto.artesaoId;
    if (donoVisualizando) return produto.ativo;
    return produtoVisivelPublicamente(produto, contexto.artesaosInativos);
  });
}

export function idsArtesaosInativos(usuarios: readonly Usuario[]): Set<string> {
  return new Set(
    usuarios
      .filter((usuario) => usuario.papel === "artesao" && !usuario.ativo)
      .map((usuario) => usuario.id)
  );
}

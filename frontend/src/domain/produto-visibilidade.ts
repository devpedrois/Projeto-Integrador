import type { Produto } from "@/types/produto";

export interface ContextoVisibilidadeProduto {
  usuarioId?: string;
}

export function produtoVisivelPublicamente(produto: Produto): boolean {
  return produto.ativo && produto.quantidadeEstoque > 0;
}

export function filtrarProdutosVisiveis(
  produtos: Produto[],
  contexto: ContextoVisibilidadeProduto = {}
): Produto[] {
  return produtos.filter((produto) => {
    const donoVisualizando = contexto.usuarioId === produto.artesaoId;
    if (donoVisualizando) return produto.ativo;
    return produtoVisivelPublicamente(produto);
  });
}

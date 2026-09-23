export interface ItemCarrinho {
  produtoId: string;
  nome: string;
  precoUnitario: number;
  quantidade: number;
  estoqueDisponivel: number;
}

export interface Carrinho {
  itens: ItemCarrinho[];
  total: number;
  atualizadoEm: string;
}

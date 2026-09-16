export interface NovaFotoProdutoInput {
  url: string;
}

export interface NovoProdutoInput {
  nome: string;
  descricao: string;
  preco: number;
  categoriaId: string;
  fotos: NovaFotoProdutoInput[];
  quantidadeEstoque: number;
}

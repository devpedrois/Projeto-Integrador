export interface ProdutoFoto {
  url: string;
  ordem: number;
}

export interface Produto {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  categoriaId: string;
  tecnicaId: string;
  regiaoId: string;
  artesaoId: string;
  fotos: ProdutoFoto[];
  quantidadeEstoque: number;
  quantidadeVendida: number;
  notaMedia: number;
  ativo: boolean;
  criadoEm: string;
}

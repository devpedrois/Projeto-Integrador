import type { Carrinho } from "@/types/carrinho";

export interface CarrinhoService {
  obter(): Promise<Carrinho>;
  adicionar(produtoId: string, quantidade: number): Promise<Carrinho>;
  alterarQuantidade(produtoId: string, quantidade: number): Promise<Carrinho>;
  remover(produtoId: string): Promise<Carrinho>;
}

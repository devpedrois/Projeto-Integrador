import { AppError } from "../errors/app-error.js";
import type { CarrinhoRepository } from "../repositories/carrinho.repository.js";

export class CarrinhoService {
  constructor(private readonly repository: CarrinhoRepository) {}
  obter(usuarioId: string) {
    return this.repository.obter(usuarioId);
  }
  salvar(
    usuarioId: string,
    produtoId: string,
    quantidade: number,
    somar: boolean,
  ) {
    return this.repository.salvar(
      usuarioId,
      produtoId,
      (produto, existente) => {
        if (!somar && existente === 0)
          throw new AppError(
            404,
            "PRODUTO_NAO_ENCONTRADO",
            "Item nao encontrado.",
          );
        const total = quantidade + (somar ? existente : 0);
        if (total > produto.quantidadeEstoque)
          throw new AppError(
            409,
            "ESTOQUE_INSUFICIENTE",
            "Estoque insuficiente.",
            { produtoId: produto.id, nome: produto.nome },
          );
        return total;
      },
    );
  }
  remover(usuarioId: string, produtoId: string) {
    return this.repository.remover(usuarioId, produtoId);
  }
}

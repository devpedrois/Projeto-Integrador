import { AppError } from "../errors/app-error.js";
import type { CatalogoRepository } from "../repositories/catalogo.repository.js";
import type {
  CatalogoQuery,
  AvaliacoesQuery,
} from "../validators/catalogo.validator.js";

export class CatalogoService {
  constructor(private readonly repository: CatalogoRepository) {}

  listar(query: CatalogoQuery) {
    return this.repository.listar(query);
  }

  async obter(id: string) {
    const produto = await this.repository.obter(id);
    if (!produto)
      throw new AppError(
        404,
        "PRODUTO_NAO_ENCONTRADO",
        "Produto nao encontrado.",
      );
    return produto;
  }

  categorias() {
    return this.repository.categorias();
  }
  tecnicas() {
    return this.repository.tecnicas();
  }
  regioes() {
    return this.repository.regioes();
  }

  artesaos() {
    return this.repository.artesaos();
  }

  async avaliacoes(query: AvaliacoesQuery) {
    await this.obter(query.produtoId);
    return this.repository.avaliacoes(query);
  }
}

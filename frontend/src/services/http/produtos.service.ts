import type { ProdutosService } from "@/services/contracts/produtos.contract";
import { ServiceError } from "@/services/errors";
import type { Produto } from "@/types/produto";
import type { ProdutoQuery } from "@/types/produto-query";
import { ApiClient } from "./api-client";
import { lerListaProdutos, lerProduto } from "./catalogo-response";

export class HttpProdutosService implements ProdutosService {
  constructor(private readonly client = new ApiClient()) {}

  list(): Promise<Produto[]> {
    return this.search({});
  }

  async search(query: ProdutoQuery): Promise<Produto[]> {
    const params = new URLSearchParams();
    for (const campo of [
      "termo",
      "categoriaId",
      "tecnicaId",
      "regiaoId",
      "artesaoId",
    ] as const) {
      const value = query[campo];
      if (value !== undefined && value.trim() !== "")
        params.set(campo, value.trim());
    }
    const filtro = params.toString();
    return lerListaProdutos(
      await this.client.request<unknown>(
        filtro ? `/produtos?${filtro}` : "/produtos",
      ),
    );
  }

  async obterPublico(id: string): Promise<Produto | null> {
    try {
      return lerProduto(
        await this.client.request<unknown>(
          `/produtos/${encodeURIComponent(id)}`,
        ),
      );
    } catch (error: unknown) {
      if (
        error instanceof ServiceError &&
        ["NAO_ENCONTRADO", "PRODUTO_NAO_ENCONTRADO"].includes(error.code)
      )
        return null;
      throw error;
    }
  }

  create: ProdutosService["create"] = async () => this.pendente();
  listByArtesao(artesaoId: string): Promise<Produto[]> {
    if (!artesaoId.trim())
      throw new ServiceError("ENTRADA_INVALIDA", "Artesão inválido.");
    return this.search({ artesaoId });
  }
  update: ProdutosService["update"] = async () => this.pendente();
  remove: ProdutosService["remove"] = async () => this.pendente();

  private pendente(): never {
    throw new ServiceError(
      "HTTP_NAO_IMPLEMENTADO",
      "Este recurso ainda está indisponível.",
    );
  }
}

import type { ProdutosService } from "@/services/contracts/produtos.contract";
import { ServiceError } from "@/services/errors";
import type { Produto } from "@/types/produto";
import type { ProdutoQuery } from "@/types/produto-query";
import type { NovoProdutoInput } from "@/types/novo-produto";
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

  async create(input: NovoProdutoInput, artesaoId: string): Promise<Produto> {
    this.identidade(artesaoId);
    return lerProduto(
      await this.client.request<unknown>("/produtos", {
        method: "POST",
        body: this.entrada(input),
      }),
    );
  }
  async listByArtesao(artesaoId: string): Promise<Produto[]> {
    if (!artesaoId.trim())
      throw new ServiceError("ENTRADA_INVALIDA", "Artesão inválido.");
    return lerListaProdutos(
      await this.client.request<unknown>("/artesao/produtos"),
    );
  }
  async update(
    id: string,
    input: NovoProdutoInput,
    artesaoId: string,
  ): Promise<Produto> {
    this.identidade(artesaoId);
    return lerProduto(
      await this.client.request<unknown>(this.rota(id), {
        method: "PATCH",
        body: this.entrada(input),
      }),
    );
  }
  async remove(id: string, artesaoId: string): Promise<void> {
    this.identidade(artesaoId);
    await this.client.request<unknown>(this.rota(id), { method: "DELETE" });
  }
  async atualizarEstoque(
    id: string,
    quantidadeEstoque: number,
  ): Promise<Produto> {
    if (
      !Number.isInteger(quantidadeEstoque) ||
      quantidadeEstoque < 0 ||
      quantidadeEstoque > 2147483647
    )
      throw new ServiceError("ENTRADA_INVALIDA", "Estoque invalido.");
    return lerProduto(
      await this.client.request<unknown>(`${this.rota(id)}/estoque`, {
        method: "PATCH",
        body: { quantidadeEstoque },
      }),
    );
  }
  private identidade(id: string): void {
    if (typeof id !== "string" || !id.trim())
      throw new ServiceError("ENTRADA_INVALIDA", "Identificador invalido.");
  }
  private rota(id: string): string {
    this.identidade(id);
    return `/produtos/${encodeURIComponent(id)}`;
  }
  private entrada(input: NovoProdutoInput): NovoProdutoInput {
    return {
      nome: input.nome,
      descricao: input.descricao,
      preco: input.preco,
      categoriaId: input.categoriaId,
      fotos: input.fotos.map(({ url }) => ({ url })),
      quantidadeEstoque: input.quantidadeEstoque,
    };
  }
}

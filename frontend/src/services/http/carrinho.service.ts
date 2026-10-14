import type { CarrinhoService } from "@/services/contracts/carrinho.contract";
import type { Carrinho, ItemCarrinho } from "@/types/carrinho";
import { ServiceError } from "@/services/errors";
import { ApiClient } from "./api-client";

function invalidar(): never {
  throw new ServiceError("RESPOSTA_INVALIDA", "Resposta de carrinho inválida.");
}
function objeto(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    invalidar();
  return value as Record<string, unknown>;
}
function lerCarrinho(value: unknown): Carrinho {
  const data = objeto(value);
  if (
    !Array.isArray(data.itens) ||
    typeof data.total !== "number" ||
    !Number.isFinite(data.total) ||
    data.total < 0 ||
    typeof data.atualizadoEm !== "string" ||
    !Number.isFinite(Date.parse(data.atualizadoEm))
  )
    invalidar();
  const ids = new Set<string>();
  const itens: ItemCarrinho[] = data.itens.map((value: unknown) => {
    const item = objeto(value);
    const { produtoId, nome, precoUnitario, quantidade, estoqueDisponivel } =
      item;
    if (
      typeof produtoId !== "string" ||
      !produtoId ||
      ids.has(produtoId) ||
      typeof nome !== "string" ||
      !nome.trim() ||
      typeof precoUnitario !== "number" ||
      !Number.isFinite(precoUnitario) ||
      precoUnitario < 0 ||
      typeof quantidade !== "number" ||
      !Number.isSafeInteger(quantidade) ||
      quantidade < 1 ||
      typeof estoqueDisponivel !== "number" ||
      !Number.isSafeInteger(estoqueDisponivel) ||
      estoqueDisponivel < 0
    )
      invalidar();
    ids.add(produtoId);
    return { produtoId, nome, precoUnitario, quantidade, estoqueDisponivel };
  });
  return { itens, total: data.total, atualizadoEm: data.atualizadoEm };
}
function validarQuantidade(quantidade: number): void {
  if (
    !Number.isSafeInteger(quantidade) ||
    quantidade < 1 ||
    quantidade > 2_147_483_647
  )
    throw new ServiceError("ENTRADA_INVALIDA", "Quantidade inválida.");
}
export class HttpCarrinhoService implements CarrinhoService {
  constructor(private readonly client = new ApiClient()) {}
  async obter(): Promise<Carrinho> {
    return lerCarrinho(await this.client.request<unknown>("/carrinho"));
  }
  async adicionar(produtoId: string, quantidade: number): Promise<Carrinho> {
    validarQuantidade(quantidade);
    this.rota(produtoId);
    return lerCarrinho(
      await this.client.request<unknown>("/carrinho/itens", {
        method: "POST",
        body: { produtoId, quantidade },
      }),
    );
  }
  async alterarQuantidade(
    produtoId: string,
    quantidade: number,
  ): Promise<Carrinho> {
    validarQuantidade(quantidade);
    return lerCarrinho(
      await this.client.request<unknown>(this.rota(produtoId), {
        method: "PATCH",
        body: { quantidade },
      }),
    );
  }
  async remover(produtoId: string): Promise<Carrinho> {
    return lerCarrinho(
      await this.client.request<unknown>(this.rota(produtoId), {
        method: "DELETE",
      }),
    );
  }
  private rota(produtoId: string): string {
    if (typeof produtoId !== "string" || !produtoId.trim())
      throw new ServiceError("ENTRADA_INVALIDA", "Produto inválido.");
    return `/carrinho/itens/${encodeURIComponent(produtoId)}`;
  }
}

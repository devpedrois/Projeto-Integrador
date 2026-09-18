import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../generated/prisma/client.js";
import { AppError } from "../errors/app-error.js";
import type { CriarPedidoInput } from "../validators/pedido.validator.js";

export interface PedidoCriado {
  pedidoId: string;
  itens: Array<{ produtoId: string; quantidade: number }>;
}

export interface PedidoRepository {
  criar(input: CriarPedidoInput): Promise<PedidoCriado>;
}

interface EstoqueRow {
  quantidadeEstoque: number;
}

export class PrismaPedidoRepository implements PedidoRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async criar(input: CriarPedidoInput): Promise<PedidoCriado> {
    return this.prisma.$transaction(async (tx) => {
      const quantidadePorProduto = new Map<string, number>();
      for (const item of input.itens) {
        quantidadePorProduto.set(
          item.produtoId,
          (quantidadePorProduto.get(item.produtoId) ?? 0) + item.quantidade,
        );
      }

      const produtoIdsOrdenados = [...quantidadePorProduto.keys()].sort();

      for (const produtoId of produtoIdsOrdenados) {
        const rows = await tx.$queryRaw<EstoqueRow[]>`
          SELECT "quantidadeEstoque" FROM "Produto" WHERE "id" = ${produtoId}::uuid FOR UPDATE
        `;
        const produto = rows[0];
        if (produto === undefined) {
          throw new AppError(404, "PRODUTO_NAO_ENCONTRADO", "Produto nao encontrado.");
        }

        const quantidadeSolicitada = quantidadePorProduto.get(produtoId) ?? 0;
        if (produto.quantidadeEstoque < quantidadeSolicitada) {
          throw new AppError(409, "ESTOQUE_INSUFICIENTE", "Estoque insuficiente.");
        }
      }

      const pedidoId = randomUUID();
      await tx.pedido.create({
        data: {
          id: pedidoId,
          compradorRef: input.compradorRef,
          compradorId: input.compradorId,
        },
      });
      await tx.intencaoNotificacao.create({
        data: { id: randomUUID(), pedidoId },
      });

      for (const produtoId of produtoIdsOrdenados) {
        const quantidade = quantidadePorProduto.get(produtoId) ?? 0;
        await tx.produto.update({
          where: { id: produtoId },
          data: { quantidadeEstoque: { decrement: quantidade } },
        });
      }

      await tx.itemPedido.createMany({
        data: input.itens.map((item) => ({
          id: randomUUID(),
          pedidoId,
          produtoId: item.produtoId,
          quantidade: item.quantidade,
        })),
      });

      return { pedidoId, itens: input.itens };
    });
  }
}

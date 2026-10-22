import type { Prisma, PrismaClient } from "../generated/prisma/client.js";

export interface IndicadoresVendas {
  quantidadeVendida: number;
  receitaTotal: number;
  numeroPedidos: number;
  ultimaVenda: Date | null;
  atualizadoEm: Date;
}

export interface IndicadoresRepository {
  obterDoArtesao(artesaoId: string): Promise<IndicadoresVendas>;
}

interface IndicadoresRow {
  quantidadeVendida: bigint;
  receitaTotal: Prisma.Decimal;
  numeroPedidos: bigint;
  ultimaVenda: Date | null;
  atualizadoEm: Date;
}

export class PrismaIndicadoresRepository implements IndicadoresRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async obterDoArtesao(artesaoId: string): Promise<IndicadoresVendas> {
    const [linha] = await this.prisma.$queryRaw<IndicadoresRow[]>`
      SELECT COALESCE(SUM(vendas.quantidade), 0)::bigint AS "quantidadeVendida",
             ROUND(COALESCE(SUM(vendas.receita), 0), 2) AS "receitaTotal",
             COUNT(DISTINCT vendas."pedidoId") AS "numeroPedidos",
             MAX(vendas."criadoEm") AS "ultimaVenda",
             statement_timestamp() AS "atualizadoEm"
      FROM (
        SELECT item."produtoId", item."pedidoId",
               SUM(item."quantidade") AS quantidade,
               SUM(item."subtotal") AS receita,
               MAX(pedido."criadoEm") AS "criadoEm"
        FROM "ItemPedido" item
        JOIN "Pedido" pedido ON pedido."id" = item."pedidoId"
        WHERE pedido."status" = 'confirmado'
        GROUP BY item."produtoId", item."pedidoId"
      ) vendas
      JOIN "Produto" produto ON produto."id" = vendas."produtoId"
      WHERE produto."artesaoId" = ${artesaoId}::uuid
    `;
    if (!linha) throw new Error("Consulta de indicadores sem resultado");
    return {
      quantidadeVendida: Number(linha.quantidadeVendida),
      receitaTotal: Number(linha.receitaTotal),
      numeroPedidos: Number(linha.numeroPedidos),
      ultimaVenda: linha.ultimaVenda,
      atualizadoEm: linha.atualizadoEm,
    };
  }
}

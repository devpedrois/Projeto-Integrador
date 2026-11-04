import { Prisma, type PrismaClient } from "../generated/prisma/client.js";

export interface IndicadoresPlataforma {
  artesaosAtivos: number;
  produtosAtivos: number;
  pedidosConfirmados: number;
  receitaTotal: Prisma.Decimal;
}

export interface IndicadoresPlataformaRepository {
  obterDaPlataforma(): Promise<IndicadoresPlataforma>;
}

export const CONSULTAS_INDICADORES_PLATAFORMA = {
  artesaosAtivos: Prisma.sql`
    SELECT COUNT(*) FROM "Usuario"
    WHERE "papel" = 'artesao' AND "ativo"
  `,
  produtosAtivos: Prisma.sql`
    SELECT COUNT(*) FROM "Produto" produto
    WHERE produto."ativo" AND NOT produto."desativadoPorAdmin"
      AND produto."quantidadeEstoque" > 0
      AND EXISTS (
        SELECT 1 FROM "Usuario" artesao
        WHERE artesao."id" = produto."artesaoId"
          AND artesao."ativo" AND artesao."papel" = 'artesao'
      )
  `,
  pedidosConfirmados: Prisma.sql`
    SELECT COUNT(*) FROM "Pedido" WHERE "status" = 'confirmado'
  `,
  receitaTotal: Prisma.sql`
    SELECT COALESCE(SUM("total"), 0::numeric)
    FROM "Pedido" WHERE "status" = 'confirmado'
  `,
};

interface IndicadoresPlataformaRow {
  artesaosAtivos: bigint;
  produtosAtivos: bigint;
  pedidosConfirmados: bigint;
  receitaTotal: Prisma.Decimal;
}

export class PrismaIndicadoresPlataformaRepository implements IndicadoresPlataformaRepository {
  constructor(private readonly prisma: Pick<PrismaClient, "$queryRaw">) {}

  async obterDaPlataforma(): Promise<IndicadoresPlataforma> {
    const consultas = CONSULTAS_INDICADORES_PLATAFORMA;
    const [linha] = await this.prisma.$queryRaw<IndicadoresPlataformaRow[]>`
      SELECT (${consultas.artesaosAtivos}) AS "artesaosAtivos",
             (${consultas.produtosAtivos}) AS "produtosAtivos",
             (${consultas.pedidosConfirmados}) AS "pedidosConfirmados",
             (${consultas.receitaTotal}) AS "receitaTotal"
    `;
    if (!linha) throw new Error("Consulta de indicadores sem resultado");
    return {
      artesaosAtivos: Number(linha.artesaosAtivos),
      produtosAtivos: Number(linha.produtosAtivos),
      pedidosConfirmados: Number(linha.pedidosConfirmados),
      receitaTotal: linha.receitaTotal,
    };
  }
}

import type { PrismaClient } from "../generated/prisma/client.js";

export interface ProdutoContextoRecomendacao {
  id: string;
  categoriaId: string;
}

export interface CandidatoRecomendacao {
  id: string;
}

export interface RecomendacaoRepository {
  buscarProduto(produtoId: string): Promise<ProdutoContextoRecomendacao | null>;
  listarCandidatosPorCategoria(params: {
    categoriaId: string;
    excluirProdutoId: string;
    limite: number;
  }): Promise<CandidatoRecomendacao[]>;
  listarFallbackGeral(params: {
    excluirProdutoId: string | null;
    limite: number;
  }): Promise<CandidatoRecomendacao[]>;
}

export class PrismaRecomendacaoRepository implements RecomendacaoRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async buscarProduto(produtoId: string): Promise<ProdutoContextoRecomendacao | null> {
    return this.prisma.produto.findUnique({
      where: { id: produtoId },
      select: { id: true, categoriaId: true },
    });
  }

  public async listarCandidatosPorCategoria(params: {
    categoriaId: string;
    excluirProdutoId: string;
    limite: number;
  }): Promise<CandidatoRecomendacao[]> {
    return this.prisma.$queryRaw<CandidatoRecomendacao[]>`
      SELECT p."id" AS "id"
      FROM "Produto" p
      LEFT JOIN (
        SELECT "produtoId", SUM("quantidade") AS "vendas"
        FROM "ItemPedido"
        GROUP BY "produtoId"
      ) vendas ON vendas."produtoId" = p."id"
      LEFT JOIN (
        SELECT "produtoId", AVG("nota") AS "notaMedia"
        FROM "Avaliacao"
        GROUP BY "produtoId"
      ) notas ON notas."produtoId" = p."id"
      WHERE p."ativo" = true
        AND p."quantidadeEstoque" > 0
        AND p."categoriaId" = ${params.categoriaId}::uuid
        AND p."id" <> ${params.excluirProdutoId}::uuid
      ORDER BY COALESCE(vendas."vendas", 0) DESC,
               COALESCE(notas."notaMedia", 0) DESC,
               p."id" ASC
      LIMIT ${params.limite}
    `;
  }

  public async listarFallbackGeral(params: {
    excluirProdutoId: string | null;
    limite: number;
  }): Promise<CandidatoRecomendacao[]> {
    return this.prisma.$queryRaw<CandidatoRecomendacao[]>`
      SELECT p."id" AS "id"
      FROM "Produto" p
      LEFT JOIN (
        SELECT "produtoId", SUM("quantidade") AS "vendas"
        FROM "ItemPedido"
        GROUP BY "produtoId"
      ) vendas ON vendas."produtoId" = p."id"
      LEFT JOIN (
        SELECT "produtoId", AVG("nota") AS "notaMedia"
        FROM "Avaliacao"
        GROUP BY "produtoId"
      ) notas ON notas."produtoId" = p."id"
      WHERE p."ativo" = true
        AND p."quantidadeEstoque" > 0
        AND (${params.excluirProdutoId}::uuid IS NULL OR p."id" <> ${params.excluirProdutoId}::uuid)
      ORDER BY COALESCE(vendas."vendas", 0) DESC,
               COALESCE(notas."notaMedia", 0) DESC,
               p."id" ASC
      LIMIT ${params.limite}
    `;
  }
}

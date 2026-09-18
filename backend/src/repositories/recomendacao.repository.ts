import type { PrismaClient } from "../generated/prisma/client.js";

export interface ProdutoContextoRecomendacao {
  id: string;
  categoriaId: string;
  regiao: string | null;
}

export interface CandidatoRecomendacao {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number | null;
  quantidadeEstoque: number;
  categoriaId: string;
  artesaoId: string;
}

interface CandidatoRecomendacaoRow {
  id: string;
  nome: string;
  descricao: string | null;
  preco: unknown;
  quantidadeEstoque: number;
  categoriaId: string;
  artesaoId: string;
}

function mapearCandidato(row: CandidatoRecomendacaoRow): CandidatoRecomendacao {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao,
    preco: row.preco === null ? null : Number(row.preco),
    quantidadeEstoque: row.quantidadeEstoque,
    categoriaId: row.categoriaId,
    artesaoId: row.artesaoId,
  };
}

export interface RecomendacaoRepository {
  buscarProduto(produtoId: string): Promise<ProdutoContextoRecomendacao | null>;
  listarCandidatosPorCategoria(params: {
    categoriaId: string;
    excluirProdutoId: string;
    limite: number;
    regiaoContexto?: string | null;
  }): Promise<CandidatoRecomendacao[]>;
  listarFallbackGeral(params: {
    excluirProdutoId: string | null;
    limite: number;
  }): Promise<CandidatoRecomendacao[]>;
}

export class PrismaRecomendacaoRepository implements RecomendacaoRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async buscarProduto(produtoId: string): Promise<ProdutoContextoRecomendacao | null> {
    const linhas = await this.prisma.$queryRaw<
      { id: string; categoriaId: string; regiao: string | null }[]
    >`
      SELECT p."id" AS "id",
             p."categoriaId" AS "categoriaId",
             pa."regiao" AS "regiao"
      FROM "Produto" p
      LEFT JOIN "PerfilArtesao" pa ON pa."usuarioId" = p."artesaoId"
      WHERE p."id" = ${produtoId}::uuid
      LIMIT 1
    `;
    return linhas[0] ?? null;
  }

  public async listarCandidatosPorCategoria(params: {
    categoriaId: string;
    excluirProdutoId: string;
    limite: number;
    regiaoContexto?: string | null;
  }): Promise<CandidatoRecomendacao[]> {
    // Reforco regional (PI4-20.4, docs/docs auxiliares/RECOMMENDATION.md):
    // prioridade lexicografica entre categoria e vendas, nunca peso numerico.
    // `regiaoContexto` so chega definido quando a opcao interna esta ligada;
    // por isso duas consultas SQL distintas, e nao uma coluna condicional,
    // preservam byte a byte o comportamento anterior quando desligada.
    if (params.regiaoContexto !== undefined) {
      const linhas = await this.prisma.$queryRaw<CandidatoRecomendacaoRow[]>`
        SELECT p."id" AS "id",
               p."nome" AS "nome",
               p."descricao" AS "descricao",
               p."preco" AS "preco",
               p."quantidadeEstoque" AS "quantidadeEstoque",
               p."categoriaId" AS "categoriaId",
               p."artesaoId" AS "artesaoId"
        FROM "Produto" p
        LEFT JOIN "PerfilArtesao" pa ON pa."usuarioId" = p."artesaoId"
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
        ORDER BY (pa."regiao" IS NOT DISTINCT FROM ${params.regiaoContexto}) DESC,
                 COALESCE(vendas."vendas", 0) DESC,
                 COALESCE(notas."notaMedia", 0) DESC,
                 p."id" ASC
        LIMIT ${params.limite}
      `;
      return linhas.map(mapearCandidato);
    }

    const linhas = await this.prisma.$queryRaw<CandidatoRecomendacaoRow[]>`
      SELECT p."id" AS "id",
             p."nome" AS "nome",
             p."descricao" AS "descricao",
             p."preco" AS "preco",
             p."quantidadeEstoque" AS "quantidadeEstoque",
             p."categoriaId" AS "categoriaId",
             p."artesaoId" AS "artesaoId"
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
    return linhas.map(mapearCandidato);
  }

  public async listarFallbackGeral(params: {
    excluirProdutoId: string | null;
    limite: number;
  }): Promise<CandidatoRecomendacao[]> {
    const linhas = await this.prisma.$queryRaw<CandidatoRecomendacaoRow[]>`
      SELECT p."id" AS "id",
             p."nome" AS "nome",
             p."descricao" AS "descricao",
             p."preco" AS "preco",
             p."quantidadeEstoque" AS "quantidadeEstoque",
             p."categoriaId" AS "categoriaId",
             p."artesaoId" AS "artesaoId"
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
    return linhas.map(mapearCandidato);
  }
}

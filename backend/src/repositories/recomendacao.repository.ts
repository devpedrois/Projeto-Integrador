import type { PrismaClient } from "../generated/prisma/client.js";

export interface ProdutoContextoRecomendacao {
  id: string;
  categoriaId: string;
  regiao: string | null;
}

export interface ProdutoElegivelRecomendacao {
  id: string;
  categoriaId: string;
}

export interface RecomendacaoRepository {
  buscarProduto(produtoId: string): Promise<ProdutoContextoRecomendacao | null>;
  listarCandidatosPorCategoria(params: {
    categoriaId: string;
    excluirProdutoId: string;
    limite: number;
    regiaoContexto?: string | null;
  }): Promise<string[]>;
  listarFallbackGeral(params: {
    excluirProdutoId: string | null;
    excluirCompradorId?: string;
    limite: number;
  }): Promise<string[]>;
  listarCandidatosPorHistorico(params: {
    compradorId: string;
    limite: number;
  }): Promise<string[]>;
  listarElegiveis(): Promise<ProdutoElegivelRecomendacao[]>;
}

export class PrismaRecomendacaoRepository implements RecomendacaoRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async buscarProduto(
    produtoId: string,
  ): Promise<ProdutoContextoRecomendacao | null> {
    const linhas = await this.prisma.$queryRaw<
      { id: string; categoriaId: string; regiao: string | null }[]
    >`
      SELECT p."id" AS "id",
             p."categoriaId" AS "categoriaId",
             pa."regiaoId" AS "regiao"
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
  }): Promise<string[]> {
    // Reforco regional (PI4-20.4, docs/docs auxiliares/RECOMMENDATION.md):
    // prioridade lexicografica entre categoria e vendas, nunca peso numerico.
    // `regiaoContexto` so chega definido quando a opcao interna esta ligada;
    // por isso duas consultas SQL distintas, e nao uma coluna condicional,
    // preservam byte a byte o comportamento anterior quando desligada.
    if (params.regiaoContexto !== undefined) {
      const linhas = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT p."id" AS "id"
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
        ORDER BY (pa."regiaoId" IS NOT DISTINCT FROM ${params.regiaoContexto}) DESC,
                 COALESCE(vendas."vendas", 0) DESC,
                 COALESCE(notas."notaMedia", 0) DESC,
                 p."id" ASC
        LIMIT ${params.limite}
      `;
      return linhas.map(({ id }) => id);
    }

    const linhas = await this.prisma.$queryRaw<{ id: string }[]>`
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
    return linhas.map(({ id }) => id);
  }

  public async listarFallbackGeral(params: {
    excluirProdutoId: string | null;
    excluirCompradorId?: string;
    limite: number;
  }): Promise<string[]> {
    const linhas = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT p."id" AS "id"
      FROM "Produto" p
      JOIN "Usuario" artesao ON artesao."id" = p."artesaoId"
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
        AND p."desativadoPorAdmin" = false
        AND artesao."ativo" = true
        AND p."quantidadeEstoque" > 0
        AND (${params.excluirProdutoId}::uuid IS NULL OR p."id" <> ${params.excluirProdutoId}::uuid)
        AND NOT EXISTS (
          SELECT 1 FROM "ItemPedido" item
          JOIN "Pedido" pedido ON pedido."id" = item."pedidoId"
          WHERE pedido."compradorId" = ${params.excluirCompradorId ?? null}::uuid
            AND pedido."status" = 'confirmado'
            AND item."produtoId" = p."id"
        )
      ORDER BY COALESCE(vendas."vendas", 0) DESC,
               COALESCE(notas."notaMedia", 0) DESC,
               p."id" ASC
      LIMIT ${params.limite}
    `;
    return linhas.map(({ id }) => id);
  }

  public async listarCandidatosPorHistorico(params: {
    compradorId: string;
    limite: number;
  }): Promise<string[]> {
    const linhas = await this.prisma.$queryRaw<{ id: string }[]>`
      WITH historico AS (
        SELECT DISTINCT item."produtoId", comprado."categoriaId"
        FROM "Pedido" pedido
        JOIN "ItemPedido" item ON item."pedidoId" = pedido."id"
        JOIN "Produto" comprado ON comprado."id" = item."produtoId"
        WHERE pedido."compradorId" = ${params.compradorId}::uuid
          AND pedido."status" = 'confirmado'
      )
      SELECT p."id" AS "id"
      FROM "Produto" p
      JOIN "Usuario" artesao ON artesao."id" = p."artesaoId"
      LEFT JOIN (
        SELECT "produtoId", SUM("quantidade") AS "vendas"
        FROM "ItemPedido" GROUP BY "produtoId"
      ) vendas ON vendas."produtoId" = p."id"
      LEFT JOIN (
        SELECT "produtoId", AVG("nota") AS "notaMedia"
        FROM "Avaliacao" GROUP BY "produtoId"
      ) notas ON notas."produtoId" = p."id"
      WHERE p."ativo" = true
        AND p."desativadoPorAdmin" = false
        AND p."quantidadeEstoque" > 0
        AND artesao."ativo" = true
        AND EXISTS (SELECT 1 FROM historico WHERE "categoriaId" = p."categoriaId")
        AND NOT EXISTS (SELECT 1 FROM historico WHERE "produtoId" = p."id")
      ORDER BY COALESCE(vendas."vendas", 0) DESC,
               COALESCE(notas."notaMedia", 0) DESC,
               p."id" ASC
      LIMIT ${params.limite}
    `;
    return linhas.map(({ id }) => id);
  }

  public async listarElegiveis(): Promise<ProdutoElegivelRecomendacao[]> {
    return this.prisma.$queryRaw<ProdutoElegivelRecomendacao[]>`
      SELECT p."id" AS "id", p."categoriaId" AS "categoriaId"
      FROM "Produto" p
      WHERE p."ativo" = true
        AND p."quantidadeEstoque" > 0
    `;
  }
}

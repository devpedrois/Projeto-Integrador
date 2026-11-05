import { Prisma, type PrismaClient } from "../generated/prisma/client.js";
import type {
  CatalogoQuery,
  AvaliacoesQuery,
} from "../validators/catalogo.validator.js";
import {
  mapearProdutoDTO,
  type ProdutoDTO,
  type ProdutoDTOOrigem,
} from "../utils/produto-dto.js";

const SQL_CATALOGO = `
  WITH pagina AS (
    SELECT p.*, COALESCE(pa."regiaoId", '') AS "regiaoId"
    FROM "Produto" p
    JOIN "Usuario" u ON u."id" = p."artesaoId" AND u."ativo" AND u."papel" = 'artesao'
    LEFT JOIN "PerfilArtesao" pa ON pa."usuarioId" = p."artesaoId"
    WHERE p."ativo" AND NOT p."desativadoPorAdmin" AND p."quantidadeEstoque" > 0
      AND ($1::text IS NULL OR p."nome" ILIKE $1::text OR p."descricao" ILIKE $1::text)
      AND ($2::uuid IS NULL OR p."categoriaId" = $2::uuid)
      AND ($3::text IS NULL OR p."tecnicaId" = $3::text)
      AND ($4::text IS NULL OR pa."regiaoId" = $4::text)
      AND ($5::uuid IS NULL OR p."artesaoId" = $5::uuid)
      AND ($6::uuid IS NULL OR p."id" = $6::uuid)
      AND ($9::uuid[] IS NULL OR p."id" = ANY($9::uuid[]))
    ORDER BY p."criadoEm" DESC, p."id" ASC
    LIMIT $7::integer OFFSET $8::integer
  )
  SELECT p.*, COALESCE(f."fotos", '[]'::jsonb) AS "fotos",
         COALESCE(a."notaMedia", 0)::double precision AS "notaMedia",
         COALESCE(v."quantidadeVendida", 0)::integer AS "quantidadeVendida"
  FROM pagina p
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object('url', "url", 'ordem', "ordem") ORDER BY "ordem") AS "fotos"
    FROM "ProdutoFoto" WHERE "produtoId" = p."id"
  ) f ON true
  LEFT JOIN LATERAL (
    SELECT AVG("nota") AS "notaMedia" FROM "Avaliacao" WHERE "produtoId" = p."id"
  ) a ON true
  LEFT JOIN LATERAL (
    SELECT SUM(i."quantidade") AS "quantidadeVendida"
    FROM "ItemPedido" i JOIN "Pedido" pedido ON pedido."id" = i."pedidoId"
    WHERE i."produtoId" = p."id" AND pedido."status" = 'confirmado'
  ) v ON true
  ORDER BY p."criadoEm" DESC, p."id" ASC
`;

export interface CatalogoRepository {
  listarMaisVendidosVisiveis(query: MaisVendidosQuery): Promise<ProdutoDTO[]>;
  carregarVisiveisPorIds(ids: string[]): Promise<ProdutoDTOOrigem[]>;
  listar(query: CatalogoQuery): Promise<ProdutoDTO[]>;
  obter(id: string): Promise<ProdutoDTO | null>;
  categorias(): Promise<{ id: string; nome: string }[]>;
  tecnicas(): Promise<{ id: string; nome: string }[]>;
  regioes(): Promise<{ id: string; nome: string }[]>;
  artesaos(): Promise<
    { id: string; nome: string; papel: "artesao"; ativo: true }[]
  >;
  avaliacoes(query: AvaliacoesQuery): Promise<{
    itens: {
      id: string;
      produtoId: string;
      nota: number;
      comentario?: string;
      criadoEm: string;
    }[];
    resumo: { media: number; total: number };
  }>;
}

export interface MaisVendidosQuery {
  produtoId?: string;
  usuarioId?: string;
  excluirIds: string[];
  limite: number;
}

export class PrismaCatalogoRepository implements CatalogoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private async consultarOrigem(
    query: CatalogoQuery,
    id: string | null = null,
    ids: string[] | null = null,
  ): Promise<ProdutoDTOOrigem[]> {
    const termo = query.termo
      ? `%${query.termo.replace(/[\\%_]/g, "\\$&")}%`
      : null;
    return this.prisma.$queryRawUnsafe<ProdutoDTOOrigem[]>(
      SQL_CATALOGO,
      termo,
      query.categoriaId ?? null,
      query.tecnicaId ?? null,
      query.regiaoId ?? null,
      query.artesaoId ?? null,
      id,
      query.limit,
      query.offset,
      ids,
    );
  }

  async listar(query: CatalogoQuery): Promise<ProdutoDTO[]> {
    return (await this.consultarOrigem(query)).map(mapearProdutoDTO);
  }

  async obter(id: string): Promise<ProdutoDTO | null> {
    const produto = (
      await this.consultarOrigem({ limit: 1, offset: 0 }, id)
    )[0];
    return produto ? mapearProdutoDTO(produto) : null;
  }

  carregarVisiveisPorIds(ids: string[]): Promise<ProdutoDTOOrigem[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.consultarOrigem({ limit: ids.length, offset: 0 }, null, ids);
  }

  async listarMaisVendidosVisiveis(
    query: MaisVendidosQuery,
  ): Promise<ProdutoDTO[]> {
    const selecionados = await this.prisma.$queryRaw<
      { id: string }[]
    >(Prisma.sql`
      SELECT p."id"
      FROM "Produto" p
      JOIN "Usuario" u ON u."id" = p."artesaoId" AND u."ativo" AND u."papel" = 'artesao'
      LEFT JOIN LATERAL (
        SELECT SUM(i."quantidade") AS vendas
        FROM "ItemPedido" i JOIN "Pedido" pedido ON pedido."id" = i."pedidoId"
        WHERE i."produtoId" = p."id" AND pedido."status" = 'confirmado'
      ) v ON true
      LEFT JOIN LATERAL (
        SELECT AVG("nota") AS media FROM "Avaliacao" WHERE "produtoId" = p."id"
      ) a ON true
      WHERE p."ativo" AND NOT p."desativadoPorAdmin" AND p."quantidadeEstoque" > 0
        AND (${query.produtoId ?? null}::uuid IS NULL OR p."id" <> ${query.produtoId ?? null}::uuid)
        AND NOT (p."id" = ANY(${query.excluirIds}::uuid[]))
        AND NOT EXISTS (
          SELECT 1 FROM "ItemPedido" i JOIN "Pedido" pedido ON pedido."id" = i."pedidoId"
          WHERE i."produtoId" = p."id" AND pedido."status" = 'confirmado'
            AND pedido."compradorId" = ${query.usuarioId ?? null}::uuid
        )
      ORDER BY CASE WHEN p."categoriaId" = (
        SELECT "categoriaId" FROM "Produto" WHERE "id" = ${query.produtoId ?? null}::uuid
      ) THEN 0 ELSE 1 END,
        COALESCE(v.vendas, 0) DESC, COALESCE(a.media, 0) DESC, p."id" ASC
      LIMIT ${query.limite}
    `);
    const produtos = await this.carregarVisiveisPorIds(
      selecionados.map(({ id }) => id),
    );
    const porId = new Map(produtos.map((produto) => [produto.id, produto]));
    return selecionados.flatMap(({ id }) => {
      const produto = porId.get(id);
      return produto ? [mapearProdutoDTO(produto)] : [];
    });
  }

  categorias() {
    return this.prisma.categoria.findMany({
      select: { id: true, nome: true },
      orderBy: [{ nome: "asc" }, { id: "asc" }],
    });
  }

  tecnicas() {
    return this.prisma.tecnica.findMany({
      select: { id: true, nome: true },
      orderBy: [{ nome: "asc" }, { id: "asc" }],
    });
  }

  regioes() {
    return this.prisma.regiao.findMany({
      select: { id: true, nome: true },
      orderBy: [{ nome: "asc" }, { id: "asc" }],
    });
  }

  async artesaos() {
    const usuarios = await this.prisma.usuario.findMany({
      where: { papel: "artesao", ativo: true },
      select: { id: true, nome: true },
      orderBy: [{ nome: "asc" }, { id: "asc" }],
    });
    return usuarios.map((usuario) => ({
      ...usuario,
      papel: "artesao" as const,
      ativo: true as const,
    }));
  }

  async avaliacoes({ produtoId, limit, offset }: AvaliacoesQuery) {
    return this.prisma.$transaction(
      async (tx) => {
        const resumo = await tx.avaliacao.aggregate({
          where: { produtoId },
          _avg: { nota: true },
          _count: { _all: true },
        });
        const total = resumo._count._all;
        const avaliacoes =
          offset >= total
            ? []
            : await tx.avaliacao.findMany({
                where: { produtoId },
                take: limit,
                skip: offset,
                orderBy: [{ criadoEm: "desc" }, { id: "asc" }],
                select: {
                  id: true,
                  produtoId: true,
                  nota: true,
                  comentario: true,
                  criadoEm: true,
                },
              });
        return {
          itens: avaliacoes.map(({ comentario, criadoEm, ...item }) => ({
            ...item,
            ...(comentario === null ? {} : { comentario }),
            criadoEm: criadoEm.toISOString(),
          })),
          resumo: {
            media: Math.round((resumo._avg.nota ?? 0) * 10) / 10,
            total,
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}

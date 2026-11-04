import { escapeIdentifier } from "pg";
import type { Pool } from "pg";
import { schemaName } from "../config/environment.js";

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
  buscarProduto(id: string): Promise<ProdutoContextoRecomendacao | null>;
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

export class PgRecomendacaoRepository implements RecomendacaoRepository {
  private readonly produtos: string;
  private readonly compras: string;
  constructor(
    private readonly pool: Pool,
    schema: string,
  ) {
    const name = escapeIdentifier(schemaName.parse(schema));
    this.produtos = `${name}.rec_produtos_elegiveis`;
    this.compras = `${name}.rec_compras_confirmadas`;
  }
  async buscarProduto(id: string): Promise<ProdutoContextoRecomendacao | null> {
    const result = await this.pool.query<ProdutoContextoRecomendacao>(
      `SELECT id,"categoriaId","regiaoId" AS regiao FROM ${this.produtos} WHERE id=$1::uuid LIMIT 1`,
      [id],
    );
    return result.rows[0] ?? null;
  }
  async listarCandidatosPorCategoria(params: {
    categoriaId: string;
    excluirProdutoId: string;
    limite: number;
    regiaoContexto?: string | null;
  }): Promise<string[]> {
    const regional = params.regiaoContexto !== undefined;
    const result = await this.pool.query<{ id: string }>(
      `
      SELECT id FROM ${this.produtos}
      WHERE elegivel AND "categoriaId"=$1::uuid AND id<>$2::uuid
      ORDER BY ${regional ? '("regiaoId" IS NOT DISTINCT FROM $4::text) DESC,' : ""}
        vendas DESC,"notaMedia" DESC,id ASC LIMIT $3
    `,
      [
        params.categoriaId,
        params.excluirProdutoId,
        params.limite,
        ...(regional ? [params.regiaoContexto] : []),
      ],
    );
    return result.rows.map(({ id }) => id);
  }
  async listarFallbackGeral(params: {
    excluirProdutoId: string | null;
    excluirCompradorId?: string;
    limite: number;
  }): Promise<string[]> {
    const result = await this.pool.query<{ id: string }>(
      `
      SELECT p.id FROM ${this.produtos} p
      WHERE p.visivel AND ($1::uuid IS NULL OR p.id<>$1::uuid)
        AND NOT EXISTS (SELECT 1 FROM ${this.compras} c WHERE c."compradorId"=$2::uuid AND c."produtoId"=p.id)
      ORDER BY p.vendas DESC,p."notaMedia" DESC,p.id ASC LIMIT $3
    `,
      [
        params.excluirProdutoId,
        params.excluirCompradorId ?? null,
        params.limite,
      ],
    );
    return result.rows.map(({ id }) => id);
  }
  async listarCandidatosPorHistorico(params: {
    compradorId: string;
    limite: number;
  }): Promise<string[]> {
    const result = await this.pool.query<{ id: string }>(
      `
      WITH historico AS (
        SELECT DISTINCT c."produtoId",p."categoriaId"
        FROM ${this.compras} c JOIN ${this.produtos} p ON p.id=c."produtoId"
        WHERE c."compradorId"=$1::uuid
      )
      SELECT p.id FROM ${this.produtos} p WHERE p.visivel
        AND EXISTS (SELECT 1 FROM historico h WHERE h."categoriaId"=p."categoriaId")
        AND NOT EXISTS (SELECT 1 FROM historico h WHERE h."produtoId"=p.id)
      ORDER BY p.vendas DESC,p."notaMedia" DESC,p.id ASC LIMIT $2
    `,
      [params.compradorId, params.limite],
    );
    return result.rows.map(({ id }) => id);
  }
  async listarElegiveis(): Promise<ProdutoElegivelRecomendacao[]> {
    return (
      await this.pool.query<ProdutoElegivelRecomendacao>(
        `SELECT id,"categoriaId" FROM ${this.produtos} WHERE elegivel`,
      )
    ).rows;
  }
}

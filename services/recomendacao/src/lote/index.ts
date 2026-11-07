import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { Pool } from "pg";
import type { PoolClient } from "pg";
import { z } from "zod";
import { postgresUrl, schemaName } from "../config/environment.js";
import { PgRecomendacaoRepository } from "../repositories/recomendacao.repository.js";
import { ExecucaoLoteRepository } from "../repositories/execucao-lote.repository.js";
import { CategoriaRecomendacaoStrategy } from "../strategies/categoria-recomendacao.strategy.js";
import { executarPool } from "./pool.js";

export const opcoesLote = z.strictObject({
  concorrencia: z.number().int().min(1).max(8),
  reforcoRegional: z.boolean(),
});
export type OpcoesLote = z.infer<typeof opcoesLote>;
export interface ConfiguracaoLote {
  connectionString: string;
  apiSchema?: string;
  recSchema?: string;
}
export interface ResultadoProduto {
  produtoId: string;
  produtoIds: string[];
}

export function configuracaoLote(
  env: NodeJS.ProcessEnv = process.env,
): ConfiguracaoLote {
  return {
    connectionString: postgresUrl.parse(env.DATABASE_URL),
    apiSchema: schemaName.parse(env.API_SCHEMA ?? "public"),
    recSchema: schemaName.parse(env.RECOMENDACAO_SCHEMA ?? "recomendacao"),
  };
}

export async function prepararLote(
  config: ConfiguracaoLote,
  concorrencia: number,
  minimoProdutos = 0,
) {
  opcoesLote.parse({ concorrencia, reforcoRegional: false });
  const apiSchema = schemaName.parse(config.apiSchema ?? "public");
  const recSchema = schemaName.parse(config.recSchema ?? "recomendacao");
  if (apiSchema === recSchema) throw new Error("Schemas devem ser distintos");
  const poolMax = concorrencia + 2;
  const pool = new Pool({
    connectionString: postgresUrl.parse(config.connectionString),
    max: poolMax,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 0,
    query_timeout: 60_000,
  });
  let erroPool = false;
  pool.on("error", () => {
    erroPool = true;
  });
  const reservados: PoolClient[] = [];
  let fechado = false;
  let emAndamento = false;
  async function fechar() {
    if (emAndamento) throw new Error("Execucao em andamento");
    if (fechado) return;
    fechado = true;
    for (const client of reservados.splice(0)) client.release(true);
    await pool.end();
  }
  try {
    for (let i = 0; i < poolMax; i++) reservados.push(await pool.connect());
    const exportador = reservados[0];
    const escritor = reservados[1];
    if (!exportador || !escritor) throw new Error("Conexoes ausentes");
    const identidade = await escritor.query<{
      restrito: boolean;
      dono: boolean;
    }>(
      `SELECT NOT (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolbypassrls OR r.rolreplication) AS restrito,
        pg_get_userbyid(n.nspowner)=current_user AS dono
       FROM pg_roles r JOIN pg_namespace n ON n.nspname=$1 WHERE r.rolname=current_user`,
      [recSchema],
    );
    if (!identidade.rows[0]?.restrito || !identidade.rows[0].dono)
      throw new Error(
        "Lote exige o papel restrito proprietario do schema privado",
      );
    await exportador.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await exportador.query(
      "SET LOCAL idle_in_transaction_session_timeout = '30min'",
    );
    const {
      rows: [metadata],
    } = await exportador.query<{
      snapshot: string;
      versao: string;
      maxConexoes: string;
    }>(
      `SELECT pg_export_snapshot() AS snapshot, version() AS versao, current_setting('max_connections') AS "maxConexoes"`,
    );
    if (
      !metadata ||
      !/^[0-9A-Fa-f]+-[0-9A-Fa-f]+-[0-9]+$/.test(metadata.snapshot)
    )
      throw new Error("Snapshot invalido");
    for (const client of reservados.slice(2)) {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      await client.query(`SET TRANSACTION SNAPSHOT '${metadata.snapshot}'`);
      await client.query("SET LOCAL statement_timeout = '30s'");
      await client.query(
        "SET LOCAL idle_in_transaction_session_timeout = '30min'",
      );
    }
    for (const client of reservados.splice(2)) client.release();
    const repository = new PgRecomendacaoRepository(pool, apiSchema);
    const registros = new ExecucaoLoteRepository(escritor, recSchema);
    const produtos = (await repository.listarElegiveis()).sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    if (produtos.length < minimoProdutos)
      throw new Error("Massa elegivel insuficiente");

    return {
      poolMax,
      conexoesPreparadas: poolMax,
      postgres: metadata.versao,
      maxConexoesPostgres: Number(metadata.maxConexoes),
      fechar,
      listarCatalogo: () => repository.listarCatalogo(),
      consultarExecucoes: (ids: string[]) => registros.consultar(ids),
      async gerarRecomendacoesEmLote(input: OpcoesLote) {
        const options = opcoesLote.parse(input);
        if (fechado || erroPool) throw new Error("Sessao de lote indisponivel");
        if (options.concorrencia !== concorrencia)
          throw new Error("Concorrencia difere da sessao preparada");
        if (emAndamento) throw new Error("Execucao em andamento");
        emAndamento = true;
        let amostrador: ReturnType<typeof setInterval> | undefined;
        try {
          const execucaoId = await registros.iniciar(
            concorrencia,
            options.reforcoRegional,
          );
          const strategy = new CategoriaRecomendacaoStrategy(
            repository,
            options.reforcoRegional,
          );
          let ativas = 0;
          let picoTarefas = 0;
          let picoEsperaPool = 0;
          amostrador = setInterval(() => {
            picoEsperaPool = Math.max(picoEsperaPool, pool.waitingCount);
          }, 10);
          const inicio = performance.now();
          const selecoes = await executarPool(
            produtos,
            concorrencia,
            async (produto) => {
              ativas++;
              picoTarefas = Math.max(picoTarefas, ativas);
              try {
                const selecao = await strategy.obter({ produtoId: produto.id });
                return {
                  produtoId: produto.id,
                  produtoIds: selecao.produtoIds,
                  estrategia: selecao.estrategia,
                };
              } finally {
                ativas--;
              }
            },
          );
          const duracaoMs = performance.now() - inicio;
          const resultados = selecoes.map(({ produtoId, produtoIds }) => ({
            produtoId,
            produtoIds,
          }));
          const estrategias = selecoes.map(({ produtoId, estrategia }) => ({
            produtoId,
            estrategia,
          }));
          clearInterval(amostrador);
          if (erroPool) throw new Error("Conexao do pool perdida");
          const hashResultado = createHash("sha256")
            .update(JSON.stringify(resultados))
            .digest("hex");
          await registros.finalizar(
            execucaoId,
            resultados.length,
            duracaoMs,
            hashResultado,
          );
          return {
            execucaoId,
            concorrencia,
            reforcoRegional: options.reforcoRegional,
            resultados,
            estrategias,
            duracaoMs,
            hashResultado,
            poolMax,
            picoTarefas,
            picoEsperaPool,
          };
        } finally {
          clearInterval(amostrador);
          emAndamento = false;
        }
      },
    };
  } catch (error) {
    await fechar();
    throw error;
  }
}

export async function gerarRecomendacoesEmLote(
  input: OpcoesLote,
  config?: ConfiguracaoLote,
) {
  const options = opcoesLote.parse(input);
  const lote = await prepararLote(
    config ?? configuracaoLote(),
    options.concorrencia,
  );
  try {
    return await lote.gerarRecomendacoesEmLote(options);
  } finally {
    await lote.fechar();
  }
}

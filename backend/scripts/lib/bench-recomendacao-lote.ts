import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { Pool } from "pg";
import type { PoolClient } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.js";
import { CategoriaRecomendacaoStrategy } from "../../src/integrations/recommendation/categoria-recomendacao.strategy.js";
import { PrismaRecomendacaoRepository } from "../../src/repositories/recomendacao.repository.js";

export class BenchLoteError extends Error {
  constructor(message: string) {
    super(`Benchmark de recomendacao: ${message}`);
    this.name = "BenchLoteError";
  }
}

export interface ResultadoProduto {
  produtoId: string;
  produtoIds: string[];
}

export interface RodadaLote {
  concorrencia: number;
  poolMax: number;
  rodada: number;
  aquecimento: boolean;
  produtos: number;
  duracaoMs: number;
  throughput: number;
  identico: boolean;
  hash: string;
  picoTarefas: number;
  picoEsperaPool: number;
}

function identidade(value: string | undefined) {
  try {
    if (!value) throw new Error();
    const url = new URL(value);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname ||
      url.pathname.length < 2
    )
      throw new Error();
    const roteamento = new Set([
      "host",
      "hostaddr",
      "port",
      "database",
      "dbname",
      "options",
      "service",
    ]);
    if (
      [...url.searchParams.keys()].some((key) =>
        roteamento.has(key.toLowerCase()),
      )
    )
      throw new Error();
    const host = decodeURIComponent(url.hostname)
      .toLowerCase()
      .replace(/\.$/, "")
      .replace(/-pooler(?=\.)/, "");
    return `${host}:${Number(url.port || "5432")}${decodeURI(url.pathname)}`;
  } catch {
    throw new BenchLoteError("conexao ausente ou invalida.");
  }
}

export function validarAmbienteLote(env: NodeJS.ProcessEnv): string {
  if (env.NODE_ENV === "production")
    throw new BenchLoteError("execucao proibida em production.");
  const value = env.DATABASE_URL_VOLUME;
  const volume = identidade(value);
  for (const nome of [
    "DATABASE_URL",
    "DIRECT_URL",
    "DATABASE_URL_DEPLOY",
  ] as const)
    if (env[nome] && identidade(env[nome]) === volume)
      throw new BenchLoteError(
        "volume deve ser separado dos bancos padrao e deploy.",
      );
  if (!value) throw new BenchLoteError("conexao de volume ausente.");
  return value;
}

export async function executarPool<T, R>(
  itens: readonly T[],
  concorrencia: number,
  tarefa: (item: T) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(concorrencia) || concorrencia < 1)
    throw new BenchLoteError("concorrencia invalida.");
  const resultados: R[] = new Array<R>(itens.length);
  let proximo = 0;
  let falhou = false;
  let falha: unknown;
  async function consumir() {
    while (!falhou && proximo < itens.length) {
      const indice = proximo++;
      const item = itens[indice];
      if (item === undefined) throw new BenchLoteError("item ausente.");
      try {
        resultados[indice] = await tarefa(item);
      } catch (error) {
        if (!falhou) falha = error;
        falhou = true;
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concorrencia, itens.length) }, consumir),
  );
  if (falhou) throw falha;
  return resultados;
}

export function compararResultados(
  esperado: readonly ResultadoProduto[],
  recebido: readonly ResultadoProduto[],
) {
  const base = new Map(esperado.map((p) => [p.produtoId, p.produtoIds]));
  const atual = new Map(recebido.map((p) => [p.produtoId, p.produtoIds]));
  return [...new Set([...base.keys(), ...atual.keys()])]
    .sort()
    .flatMap((produtoId) => {
      const a = base.get(produtoId) ?? null;
      const b = atual.get(produtoId) ?? null;
      return JSON.stringify(a) === JSON.stringify(b)
        ? []
        : [{ produtoId, esperado: a, recebido: b }];
    });
}

export function resumirLote(rodadas: readonly RodadaLote[]) {
  if (
    rodadas.length !== 15 ||
    rodadas.some(
      (r) => !r.identico || !Number.isFinite(r.duracaoMs) || r.duracaoMs <= 0,
    )
  )
    throw new BenchLoteError(
      "quinze rodadas identicas e positivas sao obrigatorias.",
    );
  const produtos = rodadas[0]?.produtos;
  const grupos = [1, 4, 8].map((concorrencia) => {
    const grupo = rodadas.filter((r) => r.concorrencia === concorrencia);
    if (
      grupo.length !== 5 ||
      grupo.some(
        (r) => r.produtos !== produtos || r.poolMax !== concorrencia + 2,
      ) ||
      [1, 2, 3, 4, 5].some(
        (n) =>
          grupo.filter((r) => r.rodada === n && r.aquecimento === (n === 1))
            .length !== 1,
      )
    )
      throw new BenchLoteError(
        "cinco rodadas por C com um aquecimento sao obrigatorias.",
      );
    const tempos = grupo
      .filter((r) => !r.aquecimento)
      .map((r) => r.duracaoMs)
      .sort((a, b) => a - b);
    const medianaMs = ((tempos[1] ?? 0) + (tempos[2] ?? 0)) / 2;
    return { concorrencia, poolMax: concorrencia + 2, medicoes: 4, medianaMs };
  });
  const base = grupos[0]?.medianaMs;
  if (!base || !produtos) throw new BenchLoteError("base sequencial vazia.");
  return grupos.map((g) => ({
    ...g,
    throughput: (produtos * 1000) / g.medianaMs,
    speedup: base / g.medianaMs,
    eficiencia: base / g.medianaMs / g.concorrencia,
  }));
}

interface ConfiguracaoLote {
  connectionString: string;
  concorrencia: 1 | 4 | 8;
  schema?: string;
  referencia?: ResultadoProduto[] | undefined;
  minimoProdutos?: number;
  progresso?: (message: string) => void;
}

export async function medirConfiguracaoLote(options: ConfiguracaoLote) {
  const schema = options.schema ?? "public";
  if (
    !/^[a-z][a-z0-9_]{0,62}$/.test(schema) ||
    ![1, 4, 8].includes(options.concorrencia)
  )
    throw new BenchLoteError("configuracao invalida.");
  const poolMax = options.concorrencia + 2;
  const pool = new Pool({
    connectionString: options.connectionString,
    max: poolMax,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 0,
    query_timeout: 60_000,
  });
  let erroPool = false;
  pool.on("error", () => {
    erroPool = true;
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
  const clientes: PoolClient[] = [];
  let exportador: PoolClient | undefined;
  try {
    // O exportador ocupa uma das duas conexoes adicionais durante cada C.
    for (let i = 0; i < poolMax; i++) clientes.push(await pool.connect());
    exportador = clientes.shift();
    if (!exportador) throw new BenchLoteError("snapshot ausente.");
    await exportador.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await exportador.query(
      "SET LOCAL idle_in_transaction_session_timeout = '30min'",
    );
    const { rows } = await exportador.query<{
      snapshot: string;
      versao: string;
      maxConexoes: string;
    }>(
      "SELECT pg_export_snapshot() AS snapshot, version() AS versao, current_setting('max_connections') AS \"maxConexoes\"",
    );
    const metadata = rows[0];
    if (
      !metadata ||
      !/^[0-9A-Fa-f]+-[0-9A-Fa-f]+-[0-9]+$/.test(metadata.snapshot)
    )
      throw new BenchLoteError("snapshot invalido.");
    for (const client of clientes) {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      await client.query(`SET TRANSACTION SNAPSHOT '${metadata.snapshot}'`);
      await client.query(`SET LOCAL search_path TO "${schema}"`);
      await client.query("SET LOCAL statement_timeout = '30s'");
      await client.query(
        "SET LOCAL idle_in_transaction_session_timeout = '30min'",
      );
      const estado = (
        await client.query<{ somenteLeitura: string }>(
          "SELECT current_setting('transaction_read_only') AS \"somenteLeitura\"",
        )
      ).rows[0];
      if (estado?.somenteLeitura !== "on")
        throw new BenchLoteError("conexao permite escrita.");
    }
    const conexoesPreparadas = clientes.length + 1;
    for (const client of clientes.splice(0)) client.release();
    const produtos = await prisma.produto.findMany({
      where: {
        ativo: true,
        desativadoPorAdmin: false,
        quantidadeEstoque: { gt: 0 },
        artesao: { ativo: true, papel: "artesao" },
      },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    if (produtos.length < (options.minimoProdutos ?? 1))
      throw new BenchLoteError("massa elegivel insuficiente.");
    const strategy = new CategoriaRecomendacaoStrategy(
      new PrismaRecomendacaoRepository(prisma),
    );
    const rodadas: RodadaLote[] = [];
    const diff: (ReturnType<typeof compararResultados>[number] & {
      concorrencia: number;
      rodada: number;
    })[] = [];
    let referencia = options.referencia;
    for (let rodada = 1; rodada <= 5; rodada++) {
      let ativas = 0;
      let concluidos = 0;
      let picoTarefas = 0;
      let picoEsperaPool = 0;
      const amostrador = setInterval(() => {
        picoEsperaPool = Math.max(picoEsperaPool, pool.waitingCount);
      }, 10);
      const inicio = performance.now();
      let resultados: ResultadoProduto[];
      try {
        resultados = await executarPool(
          produtos,
          options.concorrencia,
          async (produto) => {
            if (erroPool) throw new BenchLoteError("conexao do pool perdida.");
            ativas++;
            picoTarefas = Math.max(picoTarefas, ativas);
            try {
              const produtoIds = (
                await strategy.obter({ produtoId: produto.id })
              ).produtoIds;
              concluidos++;
              if (concluidos % 200 === 0)
                options.progresso?.(
                  `C=${options.concorrencia} rodada=${rodada}: ${concluidos}/${produtos.length} produtos`,
                );
              return { produtoId: produto.id, produtoIds };
            } finally {
              ativas--;
            }
          },
        );
      } finally {
        clearInterval(amostrador);
      }
      const duracaoMs = performance.now() - inicio;
      if (erroPool) throw new BenchLoteError("conexao do pool perdida.");
      referencia ??= resultados;
      const diferencas = compararResultados(referencia, resultados);
      diff.push(
        ...diferencas.map((d) => ({
          ...d,
          concorrencia: options.concorrencia,
          rodada,
        })),
      );
      const amostra: RodadaLote = {
        concorrencia: options.concorrencia,
        poolMax,
        rodada,
        aquecimento: rodada === 1,
        produtos: produtos.length,
        duracaoMs,
        throughput: (produtos.length * 1000) / duracaoMs,
        identico: diferencas.length === 0,
        hash: createHash("sha256")
          .update(JSON.stringify(resultados))
          .digest("hex"),
        picoTarefas,
        picoEsperaPool,
      };
      rodadas.push(amostra);
      options.progresso?.(
        `C=${options.concorrencia} rodada=${rodada}/5 aquecimento=${amostra.aquecimento} produtos=${produtos.length} tempo=${(duracaoMs / 1000).toFixed(3)}s diff=${diferencas.length}`,
      );
    }
    if (!referencia) throw new BenchLoteError("referencia sequencial ausente.");
    return {
      rodadas,
      diff,
      referencia,
      poolMax,
      conexoesPreparadas,
      somenteLeitura: true,
      postgres: metadata.versao,
      maxConexoesPostgres: Number(metadata.maxConexoes),
    };
  } finally {
    for (const client of clientes) client.release(true);
    // Fechar as sessoes desfaz as transacoes de leitura importadas.
    exportador?.release(true);
    try {
      await prisma.$disconnect();
    } finally {
      await pool.end();
    }
  }
}

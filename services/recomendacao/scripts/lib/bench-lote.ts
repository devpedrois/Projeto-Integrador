import {
  prepararLote,
  type ConfiguracaoLote,
  type ResultadoProduto,
} from "../../src/lote/index.js";
export { executarPool } from "../../src/lote/pool.js";
export type { ResultadoProduto } from "../../src/lote/index.js";

export class BenchLoteError extends Error {
  constructor(message: string) {
    super(`Benchmark de recomendacao: ${message}`);
    this.name = "BenchLoteError";
  }
}

export interface RodadaLote {
  execucaoId: string;
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

interface MedicaoLote extends ConfiguracaoLote {
  concorrencia: 1 | 4 | 8;
  referencia?: ResultadoProduto[] | undefined;
  minimoProdutos?: number;
  progresso?: (message: string) => void;
}

export async function medirConfiguracaoLote(options: MedicaoLote) {
  const lote = await prepararLote(
    options,
    options.concorrencia,
    options.minimoProdutos ?? 1,
  );
  try {
    const rodadas: RodadaLote[] = [];
    const diff: (ReturnType<typeof compararResultados>[number] & {
      concorrencia: number;
      rodada: number;
    })[] = [];
    let referencia = options.referencia;
    const ids: string[] = [];
    for (let rodada = 1; rodada <= 5; rodada++) {
      const resultado = await lote.gerarRecomendacoesEmLote({
        concorrencia: options.concorrencia,
        reforcoRegional: false,
      });
      referencia ??= resultado.resultados;
      const diferencas = compararResultados(referencia, resultado.resultados);
      diff.push(
        ...diferencas.map((d) => ({
          ...d,
          concorrencia: options.concorrencia,
          rodada,
        })),
      );
      const amostra: RodadaLote = {
        execucaoId: resultado.execucaoId,
        concorrencia: options.concorrencia,
        poolMax: lote.poolMax,
        rodada,
        aquecimento: rodada === 1,
        produtos: resultado.resultados.length,
        duracaoMs: resultado.duracaoMs,
        throughput: (resultado.resultados.length * 1000) / resultado.duracaoMs,
        identico: diferencas.length === 0,
        hash: resultado.hashResultado,
        picoTarefas: resultado.picoTarefas,
        picoEsperaPool: resultado.picoEsperaPool,
      };
      ids.push(resultado.execucaoId);
      rodadas.push(amostra);
      options.progresso?.(
        `C=${options.concorrencia} rodada=${rodada}/5 aquecimento=${amostra.aquecimento} produtos=${amostra.produtos} tempo=${(amostra.duracaoMs / 1000).toFixed(3)}s diff=${diferencas.length}`,
      );
    }
    if (!referencia) throw new BenchLoteError("referencia ausente.");
    const execucoes = await lote.consultarExecucoes(ids);
    if (
      execucoes.length !== 5 ||
      rodadas.some(
        (r) =>
          !execucoes.some(
            (e) =>
              e.id === r.execucaoId &&
              e.hashResultado === r.hash &&
              e.duracaoMs === r.duracaoMs &&
              e.produtosProcessados === r.produtos &&
              e.concorrencia === r.concorrencia &&
              e.reforcoRegional === false &&
              e.finalizadoEm !== null,
          ),
      )
    )
      throw new BenchLoteError("registros privados inconsistentes.");
    return {
      rodadas,
      diff,
      referencia,
      execucoes,
      poolMax: lote.poolMax,
      conexoesPreparadas: lote.conexoesPreparadas,
      postgres: lote.postgres,
      maxConexoesPostgres: lote.maxConexoesPostgres,
    };
  } finally {
    await lote.fechar();
  }
}

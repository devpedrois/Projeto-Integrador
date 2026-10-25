import type { PrismaClient } from "../../src/generated/prisma/client.js";

export const CONFIGURACAO_BENCH = {
  itens: 1000,
  rodadas: 5,
  aquecimentos: 1,
  workers: [1, 2, 4],
  latenciaMs: 200,
  concorrencia: 1,
  pollingMs: 1000,
  observacaoMs: 250,
} as const;

export class BenchFilaError extends Error {
  constructor(message: string) {
    super(`Benchmark da fila: ${message}`);
    this.name = "BenchFilaError";
  }
}

function identidade(value: string | undefined): string {
  try {
    if (!value) throw new Error();
    const url = new URL(value);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname ||
      url.pathname.length < 2
    )
      throw new Error();
    return `${url.hostname.replace(/-pooler(?=\.)/, "")}:${url.port || "5432"}${url.pathname}`;
  } catch {
    throw new BenchFilaError("conexao ausente ou invalida.");
  }
}

export function validarBenchEnvironment(env: NodeJS.ProcessEnv): string {
  if (env.NODE_ENV === "production")
    throw new BenchFilaError("execucao proibida em production.");
  const conexao = env.DATABASE_URL_VOLUME;
  if (!conexao) throw new BenchFilaError("conexao de volume ausente.");
  const volume = identidade(conexao);
  for (const nome of [
    "DATABASE_URL",
    "DIRECT_URL",
    "DATABASE_URL_DEPLOY",
  ] as const) {
    if (env[nome] && identidade(env[nome]) === volume)
      throw new BenchFilaError(
        "volume deve ser separado dos bancos padrao e deploy.",
      );
  }
  return conexao;
}

export interface RodadaBase {
  workers: number;
  rodada: number;
  aquecimento: boolean;
  itens: number;
  duracaoMs: number;
  valida: boolean;
}

export interface ConferenciaRodada {
  processadas: number;
  notificacoes: number;
  notificacoesEsperadas: number;
  duplicadas: number;
  tentativasMin: number;
  tentativasMax: number;
  tentativasTotal: number;
  intencoes: {
    id: string;
    pedidoId: string;
    tentativas: number;
    processadaEm: Date | null;
  }[];
}

export function mediana(valores: number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  const valor = ordenados[meio];
  if (valor === undefined || ordenados.some((n) => !Number.isFinite(n)))
    throw new BenchFilaError("amostra numerica invalida.");
  const anterior = ordenados[meio - 1];
  if (ordenados.length % 2 === 0 && anterior !== undefined)
    return (anterior + valor) / 2;
  return valor;
}

export function resumirRodadas(rodadas: readonly RodadaBase[]) {
  const validas = rodadas.filter((r) => !r.aquecimento);
  if (
    validas.some(
      (r) =>
        !r.valida ||
        r.itens !== CONFIGURACAO_BENCH.itens ||
        !Number.isFinite(r.duracaoMs) ||
        r.duracaoMs <= 0,
    )
  )
    throw new BenchFilaError("rodada invalida nas medicoes.");
  const grupos = CONFIGURACAO_BENCH.workers.map((workers) => {
    const amostras = validas.filter((r) => r.workers === workers);
    if (
      amostras.length !== CONFIGURACAO_BENCH.rodadas ||
      new Set(amostras.map((r) => r.rodada)).size !== CONFIGURACAO_BENCH.rodadas
    )
      throw new BenchFilaError("sao necessarias cinco rodadas validas por W.");
    return {
      workers,
      rodadas: amostras.length,
      medianaMs: mediana(amostras.map((r) => r.duracaoMs)),
    };
  });
  if (validas.length !== 15)
    throw new BenchFilaError("sao necessarias quinze medicoes.");
  const primeira = grupos[0];
  if (!primeira) throw new BenchFilaError("configuracao sequencial ausente.");
  const base = primeira.medianaMs;
  return grupos.map((grupo) => ({
    ...grupo,
    throughput: (CONFIGURACAO_BENCH.itens * 1000) / grupo.medianaMs,
    speedup: base / grupo.medianaMs,
    eficiencia: base / grupo.medianaMs / grupo.workers,
  }));
}

export function criarCsv(
  rodadas: readonly (RodadaBase &
    Partial<ConferenciaRodada> & { publicacaoMs?: number })[],
): string {
  const linhas = [
    "# NOTIFICACAO_LATENCIA_MS=200; latencia simulada de canal externo por job; sem envio externo",
    "# 1000 jobs; WORKER_CONCURRENCY=1; polling=1000ms; 5 medicoes + 1 aquecimento descartado por W",
    "# duracao_ms: relogio monotono, antes do primeiro publish ate observar a ultima intencao processada; observacao=250ms",
    "workers,rodada,aquecimento,itens,duracao_ms,valida,publicacao_ms,processadas,notificacoes,notificacoes_esperadas,duplicadas,tentativas_min,tentativas_max,tentativas_total",
  ];
  for (const r of rodadas)
    linhas.push(
      [
        r.workers,
        r.rodada,
        r.aquecimento,
        r.itens,
        r.duracaoMs,
        r.valida,
        r.publicacaoMs,
        r.processadas,
        r.notificacoes,
        r.notificacoesEsperadas,
        r.duplicadas,
        r.tentativasMin,
        r.tentativasMax,
        r.tentativasTotal,
      ].join(","),
    );
  return `${linhas.join("\n")}\n`;
}

export async function prepararIntencoes(
  prisma: PrismaClient,
  pedidoIds: string[],
) {
  if (pedidoIds.length === 0 || new Set(pedidoIds).size !== pedidoIds.length)
    throw new BenchFilaError("pedidos vazios ou repetidos.");
  return prisma.$transaction(
    async (tx) => {
      const pedidos = await tx.pedido.findMany({
        where: { id: { in: pedidoIds }, status: "confirmado" },
        select: {
          id: true,
          itens: { select: { produto: { select: { artesaoId: true } } } },
        },
      });
      if (
        pedidos.length !== pedidoIds.length ||
        pedidos.some((p) => p.itens.length === 0)
      )
        throw new BenchFilaError(
          "pedidos confirmados completos nao encontrados.",
        );
      const esperadas = pedidos.flatMap((p) =>
        [...new Set(p.itens.map((item) => item.produto.artesaoId))].map(
          (usuarioId) => `${usuarioId}:${p.id}:novo_pedido`,
        ),
      );
      await tx.notificacao.deleteMany({
        where: { pedidoId: { in: pedidoIds } },
      });
      await tx.intencaoNotificacao.createMany({
        data: pedidoIds.map((pedidoId) => ({ pedidoId })),
        skipDuplicates: true,
      });
      await tx.intencaoNotificacao.updateMany({
        where: { pedidoId: { in: pedidoIds } },
        data: { status: "pendente", tentativas: 0, processadaEm: null },
      });
      const intencoes = await tx.intencaoNotificacao.findMany({
        where: { pedidoId: { in: pedidoIds } },
        select: { id: true, pedidoId: true },
        orderBy: { id: "asc" },
      });
      return { intencoes, esperadas };
    },
    { timeout: 30_000 },
  );
}

export async function conferirRodada(
  prisma: PrismaClient,
  pedidoIds: string[],
  esperadas: string[],
): Promise<ConferenciaRodada> {
  const intencoes = await prisma.intencaoNotificacao.findMany({
    where: { pedidoId: { in: pedidoIds } },
    select: {
      id: true,
      pedidoId: true,
      status: true,
      tentativas: true,
      processadaEm: true,
    },
    orderBy: { id: "asc" },
  });
  const notificacoes = await prisma.notificacao.findMany({
    where: { pedidoId: { in: pedidoIds } },
    select: { usuarioId: true, pedidoId: true, tipo: true },
  });
  const chaves = notificacoes.map(
    (n) => `${n.usuarioId}:${n.pedidoId}:${n.tipo}`,
  );
  const unicas = new Set(chaves);
  const duplicadas = chaves.length - unicas.size;
  if (
    intencoes.length !== pedidoIds.length ||
    intencoes.some(
      (i) =>
        i.status !== "processada" ||
        i.processadaEm === null ||
        i.tentativas !== 1,
    ) ||
    duplicadas !== 0 ||
    unicas.size !== esperadas.length ||
    esperadas.some((e) => !unicas.has(e))
  )
    throw new BenchFilaError(
      "unicidade, tentativas ou completude divergentes.",
    );
  return {
    processadas: intencoes.length,
    notificacoes: notificacoes.length,
    notificacoesEsperadas: esperadas.length,
    duplicadas,
    tentativasMin: Math.min(...intencoes.map((i) => i.tentativas)),
    tentativasMax: Math.max(...intencoes.map((i) => i.tentativas)),
    tentativasTotal: intencoes.reduce((total, i) => total + i.tentativas, 0),
    intencoes: intencoes.map(({ id, pedidoId, tentativas, processadaEm }) => ({
      id,
      pedidoId,
      tentativas,
      processadaEm,
    })),
  };
}

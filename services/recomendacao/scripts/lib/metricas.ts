import { z } from "zod";
import { prepararLote } from "../../src/lote/index.js";
import type { ConfiguracaoLote } from "../../src/lote/index.js";
import { resumirRecomendacoes } from "../../src/strategies/recomendacao-volume.metricas.js";

export type ReforcoRegional = "on" | "off" | "ambos";
const proporcao = (numerador: number, denominador: number) => ({
  numerador,
  denominador,
  percentual: denominador === 0 ? 0 : (numerador * 100) / denominador,
});

export async function medirReforcoRegional(
  config: ConfiguracaoLote,
  reforcoRegional: ReforcoRegional,
  log: (message: string) => void = console.log,
) {
  z.enum(["on", "off", "ambos"]).parse(reforcoRegional);
  const lote = await prepararLote(config, 8);
  try {
    const catalogoCompleto = await lote.listarCatalogo();
    const elegiveis = catalogoCompleto.filter((p) => p.visivel);
    const catalogo = new Map(elegiveis.map((p) => [p.id, p]));
    const modos: ("on" | "off")[] =
      reforcoRegional === "ambos" ? ["on", "off"] : [reforcoRegional];
    const resultados = [];
    const execucoes = [];
    for (const modo of modos) {
      log(
        `Operacao gerarRecomendacoesEmLote: C=8 pool=10 reforcoRegional=${modo} modulo=src/lote/index.ts`,
      );
      const resultado = await lote.gerarRecomendacoesEmLote({
        concorrencia: 8,
        reforcoRegional: modo === "on",
      });
      const selecoes = new Map(
        resultado.resultados.map((p) => [p.produtoId, p.produtoIds]),
      );
      const estrategias = new Map(
        resultado.estrategias.map((p) => [p.produtoId, p.estrategia]),
      );
      let acertos = 0;
      let mesmaRegiao = 0;
      const respostas = elegiveis.map((contexto) => {
        const ids = selecoes.get(contexto.id);
        const estrategia = estrategias.get(contexto.id);
        if (!ids || !estrategia)
          throw new Error("Contexto publico ausente no lote");
        const itens = [...new Set(ids)]
          .filter((id) => id !== contexto.id)
          .flatMap((id) => {
            const candidato = catalogo.get(id);
            if (!candidato) return [];
            if (candidato.categoriaId === contexto.categoriaId) acertos++;
            if (contexto.regiao && candidato.regiao === contexto.regiao)
              mesmaRegiao++;
            return [{ id, categoriaId: candidato.categoriaId }];
          });
        return { estrategia, itens };
      });
      const qualidade = resumirRecomendacoes(respostas, elegiveis);
      resultados.push({
        modo,
        reforcoRegionalAtivo: modo === "on",
        produtos: catalogoCompleto.length,
        produtosElegiveis: elegiveis.length,
        contextos: elegiveis.length,
        contextosSemRegiao: elegiveis.filter((p) => !p.regiao).length,
        ...qualidade,
        acertoCategoria: proporcao(acertos, qualidade.totalRecomendacoes),
        mesmaRegiao: proporcao(mesmaRegiao, qualidade.totalRecomendacoes),
      });
      const execucao = {
        execucaoId: resultado.execucaoId,
        concorrencia: resultado.concorrencia,
        reforcoRegional: resultado.reforcoRegional,
        poolMax: resultado.poolMax,
        produtosProcessados: resultado.resultados.length,
        duracaoMs: resultado.duracaoMs,
        hashResultado: resultado.hashResultado,
      };
      execucoes.push(execucao);
      log(
        `Lote persistido: execucaoId=${execucao.execucaoId} produtos=${execucao.produtosProcessados} hash=${execucao.hashResultado}`,
      );
    }
    const registros = await lote.consultarExecucoes(
      execucoes.map((e) => e.execucaoId),
    );
    if (
      registros.length !== execucoes.length ||
      execucoes.some(
        (e) =>
          !registros.some(
            (r) =>
              r.id === e.execucaoId &&
              r.hashResultado === e.hashResultado &&
              r.concorrencia === 8 &&
              r.reforcoRegional === e.reforcoRegional &&
              r.produtosProcessados === e.produtosProcessados &&
              r.finalizadoEm !== null,
          ),
      )
    )
      throw new Error("Registros de lote inconsistentes");
    return {
      resultados,
      execucoes,
      registros: registros.map((r) => ({
        ...r,
        iniciadoEm:
          r.iniciadoEm instanceof Date
            ? r.iniciadoEm.toISOString()
            : r.iniciadoEm,
        finalizadoEm:
          r.finalizadoEm instanceof Date
            ? r.finalizadoEm.toISOString()
            : r.finalizadoEm,
      })),
    };
  } finally {
    await lote.fechar();
  }
}

export type ResultadoRegional = Awaited<
  ReturnType<typeof medirReforcoRegional>
>["resultados"][number];

const contagem = z.number().int().nonnegative();
const razao = z.object({
  numerador: contagem,
  denominador: contagem,
  percentual: z.number().finite().nonnegative(),
});
export const resultadoRegionalSchema = z.object({
  modo: z.enum(["on", "off"]),
  reforcoRegionalAtivo: z.boolean(),
  produtos: contagem,
  produtosElegiveis: contagem,
  contextos: contagem,
  contextosSemRegiao: contagem,
  totalRecomendacoes: contagem,
  coberturaCatalogo: razao,
  coberturaContextos: razao,
  taxaFallback: razao,
  diversidadeCategorias: z.object({
    mediaPorResposta: z.number().finite().nonnegative(),
    distintas: contagem,
    elegiveis: contagem,
    percentual: z.number().finite().nonnegative(),
  }),
  acertoCategoria: razao,
  mesmaRegiao: razao,
});
export const referenciaSchema = z
  .object({
    bases: z.array(
      z.object({
        base: z.string(),
        comparacaoRegional: z.array(resultadoRegionalSchema).optional(),
      }),
    ),
  })
  .transform((r) => {
    const valores = r.bases.find(
      (b) => b.base === "volume",
    )?.comparacaoRegional;
    if (
      !valores ||
      valores.length !== 2 ||
      new Set(valores.map((v) => v.modo)).size !== 2
    )
      throw new Error("Referencia regional incompleta");
    return valores;
  });

type RegistroComparavel = { modo: string } & Record<string, unknown>;
export function compararMetricas(
  esperado: readonly RegistroComparavel[],
  recebido: readonly RegistroComparavel[],
) {
  const diff: {
    modo: string;
    campo: string;
    esperado: unknown;
    recebido: unknown;
  }[] = [];
  const comparar = (modo: string, campo: string, a: unknown, b: unknown) => {
    if (
      typeof a === "object" &&
      a !== null &&
      !Array.isArray(a) &&
      typeof b === "object" &&
      b !== null &&
      !Array.isArray(b)
    ) {
      const base = a as Record<string, unknown>;
      const atual = b as Record<string, unknown>;
      for (const key of new Set([...Object.keys(base), ...Object.keys(atual)]))
        comparar(modo, campo ? `${campo}.${key}` : key, base[key], atual[key]);
    } else if (a !== b)
      diff.push({ modo, campo, esperado: a ?? null, recebido: b ?? null });
  };
  for (const modo of new Set([
    ...esperado.map((r) => r.modo),
    ...recebido.map((r) => r.modo),
  ]))
    comparar(
      modo,
      "",
      esperado.find((e) => e.modo === modo) ?? null,
      recebido.find((r) => r.modo === modo) ?? null,
    );
  return diff;
}

export function formatarTabelaRegional(resultados: ResultadoRegional[]) {
  return [
    "| Reforco regional | Produtos | Elegiveis | Recomendacoes | Cobertura catalogo % | Cobertura v0 % | Fallback % | Acerto categoria % | Mesma regiao % |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...resultados.map(
      (r) =>
        `| ${r.modo} | ${r.produtos} | ${r.produtosElegiveis} | ${r.totalRecomendacoes} | ${r.coberturaCatalogo.percentual} | ${r.coberturaContextos.percentual} | ${r.taxaFallback.percentual} | ${r.acertoCategoria.percentual} | ${r.mesmaRegiao.percentual} |`,
    ),
  ].join("\n");
}

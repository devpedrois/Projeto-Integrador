import { describe, expect, it } from "vitest";
import {
  compararResultados,
  executarPool,
  resumirLote,
  validarAmbienteLote,
  type RodadaLote,
} from "../../scripts/lib/bench-recomendacao-lote.js";

describe("30.6 benchmark de recomendacao em lote", () => {
  it("limita tarefas concorrentes sem perder a ordem original", async () => {
    let ativas = 0;
    let pico = 0;
    const resultados = await executarPool([30, 20, 10, 1, 2], 4, async (ms) => {
      ativas++;
      pico = Math.max(pico, ativas);
      await new Promise((resolve) => setTimeout(resolve, ms));
      ativas--;
      return ms * 2;
    });
    expect(resultados).toEqual([60, 40, 20, 2, 4]);
    expect(pico).toBe(4);
  });

  it("aguarda tarefas pendentes e interrompe novas tarefas apos falha", async () => {
    const concluidas: number[] = [];
    await expect(
      executarPool([0, 1, 2, 3], 2, async (n) => {
        if (n === 0) throw new Error("falha sintetica");
        await new Promise((resolve) => setTimeout(resolve, 20));
        concluidas.push(n);
        return n;
      }),
    ).rejects.toThrow("falha sintetica");
    expect(concluidas).toEqual([1]);
    await expect(executarPool([1], 0, async (n) => n)).rejects.toThrow();
  });

  it("detecta IDs ausentes, extras e mudancas na ordem", () => {
    const base = [{ produtoId: "a", produtoIds: ["b", "c"] }];
    expect(compararResultados(base, base)).toEqual([]);
    expect(
      compararResultados(base, [{ produtoId: "a", produtoIds: ["c", "b"] }]),
    ).toEqual([{ produtoId: "a", esperado: ["b", "c"], recebido: ["c", "b"] }]);
    expect(compararResultados(base, [])).toEqual([
      { produtoId: "a", esperado: ["b", "c"], recebido: null },
    ]);
    expect(compararResultados([], base)).toEqual([
      { produtoId: "a", esperado: null, recebido: ["b", "c"] },
    ]);
  });

  it("descarta somente o primeiro aquecimento de cinco rodadas por C", () => {
    const rodadas: RodadaLote[] = [1, 4, 8].flatMap((concorrencia) =>
      [1, 8000, 12000, 10000, 10000].map((tempo, indice) => ({
        concorrencia,
        poolMax: concorrencia + 2,
        rodada: indice + 1,
        aquecimento: indice === 0,
        produtos: 1000,
        duracaoMs: tempo / concorrencia,
        throughput: 1000 / (tempo / concorrencia / 1000),
        identico: true,
        hash: "sintetico",
        picoTarefas: concorrencia,
        picoEsperaPool: 0,
      })),
    );
    expect(resumirLote(rodadas)).toEqual(
      [1, 4, 8].map((concorrencia) => ({
        concorrencia,
        poolMax: concorrencia + 2,
        medicoes: 4,
        medianaMs: 10000 / concorrencia,
        throughput: 100 * concorrencia,
        speedup: concorrencia,
        eficiencia: 1,
      })),
    );
    expect(() => resumirLote(rodadas.slice(1))).toThrow();
    expect(() =>
      resumirLote(
        rodadas.map((r, i) => (i === 0 ? { ...r, identico: false } : r)),
      ),
    ).toThrow();
    expect(() =>
      resumirLote(
        rodadas.map((r, i) => (i === 0 ? { ...r, duracaoMs: NaN } : r)),
      ),
    ).toThrow();
  });

  const env = {
    DATABASE_URL: "postgresql://teste:segredo@ep-demo.neon.tech/origem",
    DIRECT_URL: "postgresql://teste:segredo@ep-demo.neon.tech/origem",
    DATABASE_URL_DEPLOY:
      "postgresql://teste:segredo@ep-deploy.neon.tech/origem",
    DATABASE_URL_VOLUME:
      "postgresql://teste:segredo@ep-volume-pooler.neon.tech/origem",
  };
  it("aceita apenas volume separado sem expor a conexao", () => {
    expect(validarAmbienteLote(env)).toBe(env.DATABASE_URL_VOLUME);
  });
  it.each([
    "postgresql://teste:segredo@EP-DEMO.NEON.TECH./origem",
    "postgresql://teste:segredo@ep-demo.neon.tech/ori%67em",
    "postgresql://teste:segredo@ep-volume.neon.tech/origem?host=ep-demo.neon.tech",
    "postgresql://teste:segredo@ep-volume.neon.tech/origem?options=endpoint%3Dep-demo",
  ])("impede aliases e redirecionamentos da conexao de volume", (url) => {
    expect(() =>
      validarAmbienteLote({ ...env, DATABASE_URL_VOLUME: url }),
    ).toThrow();
  });
  it.each([
    { ...env, DATABASE_URL_VOLUME: undefined },
    { ...env, NODE_ENV: "production" },
    { ...env, DATABASE_URL_VOLUME: "https://segredo.example" },
    { ...env, DATABASE_URL_VOLUME: env.DATABASE_URL },
    {
      ...env,
      DATABASE_URL_VOLUME: env.DIRECT_URL.replace("ep-demo", "ep-demo-pooler"),
    },
    { ...env, DATABASE_URL_VOLUME: env.DATABASE_URL_DEPLOY },
  ])("recusa conexao inadequada com erro sanitizado", (ambiente) => {
    expect(() => validarAmbienteLote(ambiente)).toThrow(
      /^Benchmark de recomendacao:/,
    );
    try {
      validarAmbienteLote(ambiente);
    } catch (error) {
      expect(String(error)).not.toContain("segredo");
    }
  });
});

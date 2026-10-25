import { describe, expect, it } from "vitest";
import {
  validarBenchEnvironment,
  resumirRodadas,
  criarCsv,
  CONFIGURACAO_BENCH,
} from "../../scripts/lib/bench-fila.js";

const ambiente = {
  DATABASE_URL: "postgresql://teste:synthetic@ep-demo.neon.tech/origem",
  DIRECT_URL: "postgresql://teste:synthetic@ep-demo.neon.tech/origem",
  DATABASE_URL_VOLUME:
    "postgresql://teste:synthetic@ep-volume.neon.tech/origem",
  DATABASE_URL_DEPLOY:
    "postgresql://teste:synthetic@ep-deploy.neon.tech/origem",
};

describe("30.5 benchmark da fila", () => {
  it("fixa mil jobs, cinco medicoes e um aquecimento por configuracao", () => {
    expect(CONFIGURACAO_BENCH).toMatchObject({
      itens: 1000,
      rodadas: 5,
      aquecimentos: 1,
      workers: [1, 2, 4],
      latenciaMs: 200,
      concorrencia: 1,
    });
  });

  it("seleciona somente a conexao de volume separada", () => {
    expect(validarBenchEnvironment(ambiente)).toBe(
      ambiente.DATABASE_URL_VOLUME,
    );
  });

  it.each([
    { ...ambiente, DATABASE_URL_VOLUME: undefined },
    { ...ambiente, DATABASE_URL_VOLUME: "https://exemplo.test" },
    { ...ambiente, NODE_ENV: "production" },
    { ...ambiente, DATABASE_URL_VOLUME: ambiente.DATABASE_URL },
    { ...ambiente, DATABASE_URL_VOLUME: ambiente.DIRECT_URL },
    { ...ambiente, DATABASE_URL_VOLUME: ambiente.DATABASE_URL_DEPLOY },
    {
      ...ambiente,
      DATABASE_URL_VOLUME:
        ambiente.DATABASE_URL_DEPLOY.replace("ep-deploy", "ep-deploy-pooler") +
        "?sslmode=require",
    },
  ])("recusa ambiente inseguro sem revelar credenciais", (input) => {
    expect(() => validarBenchEnvironment(input)).toThrow(
      /^Benchmark da fila: /,
    );
    try {
      validarBenchEnvironment(input);
    } catch (error) {
      expect(String(error)).not.toContain("synthetic");
    }
  });

  it("exclui aquecimento da mediana, throughput, speedup e eficiencia", () => {
    const rodadas = [
      {
        workers: 1,
        rodada: 0,
        aquecimento: true,
        duracaoMs: 1,
        itens: 1000,
        valida: true,
      },
      ...[11000, 9000, 10000, 12000, 8000].map((duracaoMs, indice) => ({
        workers: 1,
        rodada: indice + 1,
        aquecimento: false,
        duracaoMs,
        itens: 1000,
        valida: true,
      })),
      ...[4500, 5000, 5500, 4000, 6000].map((duracaoMs, indice) => ({
        workers: 2,
        rodada: indice + 1,
        aquecimento: false,
        duracaoMs,
        itens: 1000,
        valida: true,
      })),
      ...[2500, 3000, 2000, 2700, 2300].map((duracaoMs, indice) => ({
        workers: 4,
        rodada: indice + 1,
        aquecimento: false,
        duracaoMs,
        itens: 1000,
        valida: true,
      })),
    ];
    expect(resumirRodadas(rodadas)).toEqual([
      {
        workers: 1,
        rodadas: 5,
        medianaMs: 10000,
        throughput: 100,
        speedup: 1,
        eficiencia: 1,
      },
      {
        workers: 2,
        rodadas: 5,
        medianaMs: 5000,
        throughput: 200,
        speedup: 2,
        eficiencia: 1,
      },
      {
        workers: 4,
        rodadas: 5,
        medianaMs: 2500,
        throughput: 400,
        speedup: 4,
        eficiencia: 1,
      },
    ]);
    expect(criarCsv(rodadas)).toMatch(
      /^#.*NOTIFICACAO_LATENCIA_MS=200.*simulada/m,
    );
    expect(criarCsv(rodadas)).toContain(
      "workers,rodada,aquecimento,itens,duracao_ms,valida",
    );
    expect(criarCsv(rodadas)).toContain("1,0,true,1000,1,true");
    const primeira = rodadas[0];
    if (!primeira) throw new Error("Fixture vazia");
    expect(() =>
      resumirRodadas([{ ...primeira, aquecimento: false, valida: false }]),
    ).toThrow();
    expect(() =>
      resumirRodadas(rodadas.filter((item) => item.workers !== 4)),
    ).toThrow();
  });
});

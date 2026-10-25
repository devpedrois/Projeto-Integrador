import { describe, expect, it } from "vitest";
import {
  resumirTempos,
  resumirRecomendacoes,
} from "../../src/integrations/recommendation/recomendacao-volume.metricas.js";
import {
  parseMetricsOptions,
  validarMetricsEnvironment,
} from "../../scripts/metricas-recomendacao.js";

describe("IA-04: metricas independentes de ranking", () => {
  it("calcula cobertura do catalogo, cobertura v0, fallback e diversidade", () => {
    const resultado = resumirRecomendacoes(
      [
        {
          estrategia: "categoria",
          itens: [
            { id: "a", categoriaId: "ceramica" },
            { id: "b", categoriaId: "tecido" },
          ],
        },
        {
          estrategia: "fallback-geral",
          itens: [{ id: "a", categoriaId: "ceramica" }],
        },
        { estrategia: "fallback-geral", itens: [] },
      ],
      [
        { id: "a", categoriaId: "ceramica" },
        { id: "b", categoriaId: "tecido" },
        { id: "c", categoriaId: "madeira" },
        { id: "d", categoriaId: "madeira" },
      ],
    );
    expect(resultado.coberturaCatalogo).toEqual({
      numerador: 2,
      denominador: 4,
      percentual: 50,
    });
    expect(resultado.coberturaContextos.percentual).toBeCloseTo(200 / 3);
    expect(resultado.taxaFallback).toEqual({
      numerador: 2,
      denominador: 3,
      percentual: 200 / 3,
    });
    expect(resultado.diversidadeCategorias).toEqual({
      mediaPorResposta: 1,
      distintas: 2,
      elegiveis: 3,
      percentual: 200 / 3,
    });
    expect(resultado.totalRecomendacoes).toBe(3);
  });

  it("retorna zeros sem catalogo ou respostas", () => {
    const resultado = resumirRecomendacoes([], []);
    expect(resultado.coberturaCatalogo.percentual).toBe(0);
    expect(resultado.coberturaContextos.percentual).toBe(0);
    expect(resultado.taxaFallback.percentual).toBe(0);
    expect(resultado.diversidadeCategorias.mediaPorResposta).toBe(0);
    expect(resultado.diversidadeCategorias.percentual).toBe(0);
    expect(resumirTempos([])).toEqual({ amostras: 0, mediaMs: 0, p95Ms: 0 });
  });

  it("p95 usa nearest-rank e nao interpola ou confunde media", () => {
    const amostras = [20, ...Array.from({ length: 19 }, (_, i) => i + 1)];
    expect(resumirTempos(amostras)).toEqual({
      amostras: 20,
      mediaMs: 10.5,
      p95Ms: 19,
    });
    expect(amostras[0]).toBe(20);
    expect(resumirTempos([7])).toEqual({ amostras: 1, mediaMs: 7, p95Ms: 7 });
  });
});

describe("IA-04: CLI e configuracao segura", () => {
  it("IA.3 compara ambos os modos por padrao", () => {
    expect(parseMetricsOptions([])).toHaveProperty("reforcoRegional", "ambos");
  });

  it.each(["on", "off", "ambos"])("IA.3 aceita reforco regional %s", (modo) => {
    expect(parseMetricsOptions(["--reforco-regional", modo])).toHaveProperty(
      "reforcoRegional",
      modo,
    );
  });

  it.each(["true", "ON", "", "on,off"])(
    "IA.3 rejeita modo invalido %j",
    (modo) => {
      expect(() => parseMetricsOptions(["--reforco-regional", modo])).toThrow(
        "Argumentos de metricas invalidos.",
      );
    },
  );
  it("seleciona branch de volume por nome da variavel", () => {
    const options = parseMetricsOptions([
      "--volume-env",
      "DIRECT_URL_VOLUME",
      "--schema-volume",
      "volume",
      "--repeticoes",
      "2",
    ]);
    expect(options.volumeEnv).toBe("DIRECT_URL_VOLUME");
    expect(options.schemaVolume).toBe("volume");
    expect(options.repeticoes).toBe(2);
    expect(options.isolado).toBe(false);
  });

  it.each(
    [
      ["--schema-volume", "public; DROP TABLE Usuario"],
      ["--volume-env", "postgresql://nao-imprimir"],
      ["--repeticoes", "0"],
      ["--repeticoes", "1.5"],
      ["--repeticoes", "11"],
      ["--isolado", "--volume-env", "DIRECT_URL_VOLUME"],
      ["--desconhecido", "segredo"],
    ].map((args) => ({ args })),
  )("recusa argumentos invalidos: %j", ({ args }) => {
    expect(() => parseMetricsOptions(args)).toThrow();
  });

  it("variavel ausente informa apenas seu nome", () => {
    const options = parseMetricsOptions([]);
    expect(() =>
      validarMetricsEnvironment(options, {
        DATABASE_URL: "postgresql://user:senha@demo.test/origem",
      }),
    ).toThrow("DATABASE_URL_VOLUME");
  });

  it("schemas isolados recusam producao e a variante pooler do deploy", () => {
    const options = parseMetricsOptions(["--isolado"]);
    expect(() =>
      validarMetricsEnvironment(options, {
        NODE_ENV: "production",
        DIRECT_URL: "postgresql://user:senha@teste.test/origem",
      }),
    ).toThrow();
    expect(() =>
      validarMetricsEnvironment(options, {
        DIRECT_URL: "postgresql://user:senha@deploy.test/origem",
        DATABASE_URL_DEPLOY:
          "postgresql://user:senha@deploy-pooler.test/origem",
      }),
    ).toThrow();
  });
});

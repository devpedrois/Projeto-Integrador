import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const carregar = () => import("../../scripts/busca-p95.js");
const volume = "postgresql://synthetic:password@volume.example/origem";

describe("BD.2: configuracao do benchmark de busca", () => {
  it("seleciona volume separado e termo com pelo menos tres caracteres", async () => {
    const { parseBuscaOptions } = await carregar();
    expect(parseBuscaOptions([])).toMatchObject({
      volumeEnv: "DATABASE_URL_VOLUME",
      schema: "public",
      termo: "vaso",
    });
    expect(
      parseBuscaOptions([
        "--volume-env",
        "DIRECT_URL_VOLUME",
        "--schema",
        "volume",
        "--termo",
        "  barro  ",
      ]).termo,
    ).toBe("barro");
  });

  it.each([
    ["--termo", "ab"],
    ["--termo", "   "],
    ["--termo", "a".repeat(121)],
    ["--schema", "public; DROP SCHEMA public"],
    ["--volume-env", "postgresql://secret"],
    ["--aquecimentos", "0"],
    ["--amostras", "1"],
    ["--desconhecido"],
  ])("recusa argumentos invalidos %j", async (...args) => {
    const { parseBuscaOptions } = await carregar();
    expect(() => parseBuscaOptions(args)).toThrow();
  });

  it.each([
    {},
    { DATABASE_URL_VOLUME: "https://volume.example" },
    { DATABASE_URL_VOLUME: volume, NODE_ENV: "production" },
    {
      DATABASE_URL_VOLUME: volume,
      DATABASE_URL_DEPLOY:
        "postgresql://other:secret@volume-pooler.example/origem",
    },
    { DATABASE_URL_VOLUME: volume, DATABASE_URL: volume },
  ])("recusa ambiente inadequado antes de conectar", async (env) => {
    const { parseBuscaOptions, validarBuscaEnvironment } = await carregar();
    expect(() => validarBuscaEnvironment(parseBuscaOptions([]), env)).toThrow();
  });

  it("aceita schema isolado na mesma base e nome alternativo", async () => {
    const { parseBuscaOptions, validarBuscaEnvironment } = await carregar();
    expect(
      validarBuscaEnvironment(
        parseBuscaOptions([
          "--schema",
          "isolado",
          "--volume-env",
          "DIRECT_URL_VOLUME",
        ]),
        { DIRECT_URL_VOLUME: volume, DATABASE_URL: volume },
      ),
    ).toBe(volume);
  });

  it("importa sem conectar ou produzir arquivos", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--input-type=module",
        "--eval",
        'await import("./scripts/busca-p95.ts");',
      ],
      { encoding: "utf8", timeout: 10_000 },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });

  it("recusa argumentos sem revelar seus valores", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "scripts/busca-p95.ts",
        "--schema",
        "sentinela-secreta;",
      ],
      { encoding: "utf8", timeout: 10_000 },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toBe(
      "bench:busca recusado ou falhou. Confira argumentos, ambiente e banco.\n",
    );
    expect(result.stdout).toBe("");
  });
});

describe("BD.2: percentis independentes", () => {
  it("calcula nearest-rank sem alterar amostras ou remover outliers", async () => {
    const { resumirBusca } = await carregar();
    const tempos = [
      900,
      ...Array.from({ length: 29 }, (_, index) => index + 1),
    ];
    expect(resumirBusca(tempos)).toEqual({
      amostras: 30,
      p50Ms: 15,
      p95Ms: 29,
      maxMs: 900,
      aprovado: true,
    });
    expect(tempos[0]).toBe(900);
  });

  it("reprova p95 igual a 500 ms", async () => {
    const { resumirBusca } = await carregar();
    expect(
      resumirBusca([
        ...Array.from({ length: 28 }, (_, index) => index + 1),
        500,
        1000,
      ]),
    ).toEqual({
      amostras: 30,
      p50Ms: 15,
      p95Ms: 500,
      maxMs: 1000,
      aprovado: false,
    });
  });

  it.each(
    [[], [1], Array(30).fill(-1), Array(30).fill(Infinity)].map((tempos) => ({
      tempos,
    })),
  )("recusa amostras insuficientes ou invalidas", async ({ tempos }) => {
    const { resumirBusca } = await carregar();
    expect(() => resumirBusca(tempos)).toThrow();
  });
});

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

async function carregarScript() {
  expect(
    existsSync(new URL("../../scripts/db-explain.ts", import.meta.url)),
    "Script db:explain ausente",
  ).toBe(true);
  return import("../../scripts/db-explain.js");
}

describe("entrada db:explain", () => {
  it("seleciona volume e candidato permitido sem aceitar SQL externo", async () => {
    const { parseExplainOptions } = await carregarScript();
    expect(
      parseExplainOptions(["--volume", "--candidate", "confirmado-comprador"]),
    ).toMatchObject({ volume: true, candidate: "confirmado-comprador" });
    expect(() =>
      parseExplainOptions(["--candidate", "confirmado-id"]),
    ).toThrow();
    expect(() =>
      parseExplainOptions(["--volume", "--candidate", "DROP TABLE"]),
    ).toThrow();
    expect(() => parseExplainOptions(["--volume", "--compare"])).toThrow();
  });

  it("volume exige branch separada e recusa producao", async () => {
    const { validateExplainEnvironment } = await carregarScript();
    const env = {
      DIRECT_URL: "postgresql://test:secret@principal.example/db",
      DATABASE_URL_VOLUME: "postgresql://test:secret@volume.example/db",
    };
    expect(validateExplainEnvironment(env, false, true)).toBe(
      env.DATABASE_URL_VOLUME,
    );
    expect(() =>
      validateExplainEnvironment(
        { ...env, NODE_ENV: "production" },
        false,
        true,
      ),
    ).toThrow();
    expect(() =>
      validateExplainEnvironment(
        { ...env, DATABASE_URL_VOLUME: env.DIRECT_URL },
        false,
        true,
      ),
    ).toThrow();
    expect(() =>
      validateExplainEnvironment(
        {
          ...env,
          DATABASE_URL_DEPLOY:
            "postgresql://test:secret@volume-pooler.example/db",
        },
        false,
        true,
      ),
    ).toThrow();
    expect(() =>
      validateExplainEnvironment({ DIRECT_URL: env.DIRECT_URL }, false, true),
    ).toThrow();
  });
  it("CLI retorna erro sanitizado para argumento invalido", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        fileURLToPath(new URL("../../scripts/db-explain.ts", import.meta.url)),
        "--schema",
        "sentinela_segredo;",
      ],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("db:explain recusado ou falhou");
    expect(result.stderr).not.toContain("sentinela_segredo");
  });
  it("usa leitura atual sem DDL por padrao", async () => {
    const { parseExplainOptions } = await carregarScript();
    expect(parseExplainOptions([])).toMatchObject({
      compare: false,
      schema: "public",
      phase: "atual",
      term: "vaso",
    });
    expect(
      relative(
        resolve("../evidencias/PI4-28-W10-Modelo-Fisico/BD-04-indices"),
        parseExplainOptions([]).output,
      ),
    ).toMatch(/^\d{4}-\d{2}-\d{2}T[^\\/]+$/);
  });

  it.each([
    ["--schema", 'public"; DROP SCHEMA public; --'],
    ["--phase", "inventado"],
    ["--termo", "ab"],
    ["--termo", "   "],
    ["--termo", "a".repeat(121)],
    ["--desconhecido"],
    ["--compare", "--schema", "public"],
  ])("rejeita entrada invalida %j antes de conectar", async (...args) => {
    const { parseExplainOptions } = await carregarScript();
    expect(() => parseExplainOptions(args)).toThrow();
  });

  it("escapa curingas, preservando a busca literal", async () => {
    const { searchPattern } = await carregarScript();
    expect(searchPattern("  barro%_\\  ")).toBe("%barro\\%\\_\\\\%");
    expect(searchPattern("'; DROP TABLE Produto; --")).toBe(
      "%'; DROP TABLE Produto; --%",
    );
  });

  it.each([
    {},
    { DIRECT_URL: "https://example.com" },
    { DIRECT_URL: "postgresql://localhost" },
    {
      DIRECT_URL: "postgresql://test:secret@localhost/db",
      NODE_ENV: "production",
      EXPLAIN_ISOLATED: "1",
    },
    { DIRECT_URL: "postgresql://test:secret@localhost/db" },
    {
      DIRECT_URL: "postgresql://test:secret@ep-demo-pooler.example/db",
      DATABASE_URL_DEPLOY: "postgresql://other:different@ep-demo.example/db",
      EXPLAIN_ISOLATED: "1",
    },
  ])("recusa comparacao sem ambiente de teste valido", async (env) => {
    const { validateExplainEnvironment } = await carregarScript();
    expect(() => validateExplainEnvironment(env, true)).toThrow();
  });

  it("recusa URLs direta e da aplicacao em branches diferentes", async () => {
    const { validateExplainEnvironment } = await carregarScript();
    expect(() =>
      validateExplainEnvironment(
        {
          DIRECT_URL: "postgresql://test:secret@branch1.example/db",
          DATABASE_URL: "postgresql://test:secret@branch2.example/db",
        },
        false,
      ),
    ).toThrow();
  });
});

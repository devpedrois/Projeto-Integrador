import "dotenv/config";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { afterAll, expect, it } from "vitest";

const pool = new Pool({ connectionString: process.env.DIRECT_URL });
const script = fileURLToPath(
  new URL("../../scripts/concorrencia-checkout.ts", import.meta.url),
);

async function executar(args: string[], extra: NodeJS.ProcessEnv = {}) {
  const child = spawn(process.execPath, ["--import", "tsx", script, ...args], {
    windowsHide: true,
    env: { ...process.env, CONCURRENCY_TEST_PORT: "3917", ...extra },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
    stderr += chunk;
  });
  const code = await new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  return { code, stdout, stderr };
}

afterAll(async () => {
  await pool.end();
});

it("limpa schema quando a porta do servidor esta ocupada", async () => {
  const ocupado = createServer();
  await new Promise<void>((resolve) => ocupado.listen(0, "127.0.0.1", resolve));
  try {
    const address = ocupado.address();
    if (!address || typeof address === "string")
      throw new Error("Porta de teste ausente");
    const resultado = await executar([
      "--clientes",
      "2",
      "--port",
      String(address.port),
    ]);
    expect(resultado.code).toBe(1);
    expect(resultado.stderr).toContain("CONCURRENCY_TEST_PORT");
    const schema = /^Schema temporario: (web10_[a-f0-9]{32})$/m.exec(
      resultado.stdout,
    )?.[1];
    expect(schema).toBeDefined();
    const depois = await pool.query(
      "SELECT 1 FROM information_schema.schemata WHERE schema_name = $1",
      [schema],
    );
    expect(depois.rows).toEqual([]);
  } finally {
    await new Promise<void>((resolve, reject) =>
      ocupado.close((error) => (error ? reject(error) : resolve())),
    );
  }
}, 30_000);

it("comando autentica cinco compradores, valida tres rodadas e remove seu schema", async () => {
  const resultado = await executar(["--clientes", "5"]);
  expect(resultado.code, resultado.stderr + resultado.stdout).toBe(0);
  const rodadas = resultado.stdout.split(/\r?\n/).flatMap((linha) => {
    const match = /^Rodada [1-3]: (.+)$/.exec(linha);
    return match?.[1] ? [JSON.parse(match[1])] : [];
  });
  expect(rodadas).toEqual([
    { sucessos: 1, conflitos409: 4, estoqueFinal: 0, pedidosProduto: 1 },
    { sucessos: 1, conflitos409: 4, estoqueFinal: 0, pedidosProduto: 1 },
    { sucessos: 1, conflitos409: 4, estoqueFinal: 0, pedidosProduto: 1 },
  ]);
  const resumo = resultado.stdout
    .split(/\r?\n/)
    .find((linha) => linha.startsWith("Resumo: "));
  expect(resumo).toBeDefined();
  expect(JSON.parse(resumo?.slice(8) ?? "{}")).toEqual({
    compradores: 5,
    cadastros: 5,
    logins: 5,
    schemaRemovido: true,
  });
  const schema = /^Schema temporario: (web10_[a-f0-9]{32})$/m.exec(
    resultado.stdout,
  )?.[1];
  expect(schema).toBeDefined();
  const depois = await pool.query<{ schema_name: string }>(
    "SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1",
    [schema],
  );
  expect(depois.rows).toEqual([]);
  expect(resultado.stdout).not.toMatch(
    /origem_sessao|Senha|senhaHash|postgres(ql)?:\/\//,
  );
}, 120_000);

it.each(["0", "1", "-1", "1.5", "101", "abc"])(
  "rejeita N=%s antes de conectar",
  async (clientes) => {
    const resultado = await executar(["--clientes", clientes], {
      DATABASE_URL: "",
      DIRECT_URL: "",
    });
    expect(resultado.code).toBe(1);
    expect(resultado.stderr).toContain("CONCURRENCY_TEST_CLIENTS");
    expect(resultado.stdout).not.toContain("Rodada");
  },
  10_000,
);

it("recusa ambiente production antes de criar dados", async () => {
  const resultado = await executar([], { NODE_ENV: "production" });
  expect(resultado.code).toBe(1);
  expect(resultado.stderr).toContain("NODE_ENV");
  expect(resultado.stdout).not.toContain("Rodada");
}, 10_000);

it("recusa a mesma base identificada como deploy", async () => {
  const resultado = await executar([], {
    DATABASE_URL_DEPLOY: process.env.DIRECT_URL,
  });
  expect(resultado.code).toBe(1);
  expect(resultado.stderr).toContain("DATABASE_URL_DEPLOY");
  expect(resultado.stdout).not.toContain("Rodada");
}, 30_000);

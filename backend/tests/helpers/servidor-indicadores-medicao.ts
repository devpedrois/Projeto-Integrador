import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { RegistroCache } from "../../src/utils/cache-http.js";

export async function iniciarServidorIndicadores(config: {
  databaseUrl: string;
  schema: string;
  secret: string;
}) {
  const child = fork(
    fileURLToPath(
      new URL(
        "../../scripts/helpers/indicadores-cache-servidor.ts",
        import.meta.url,
      ),
    ),
    [],
    {
      execArgv: ["--import", "tsx"],
      silent: true,
      env: {
        ...process.env,
        CACHE_TEST_DATABASE_URL: config.databaseUrl,
        CACHE_TEST_SCHEMA: config.schema,
        CACHE_TEST_JWT_SECRET: config.secret,
      },
    },
  );
  const logs: RegistroCache[] = [];
  let linhas = "";
  child.stdout?.on("data", (parte: Buffer) => {
    linhas += parte.toString("utf8");
    let indice: number;
    while ((indice = linhas.indexOf("\n")) >= 0) {
      const linha = linhas.slice(0, indice);
      linhas = linhas.slice(indice + 1);
      try {
        const valor: unknown = JSON.parse(linha);
        if (
          typeof valor === "object" &&
          valor !== null &&
          "rota" in valor &&
          typeof valor.rota === "string" &&
          "cache" in valor &&
          (valor.cache === "MISS" || valor.cache === "HIT") &&
          "duracaoMs" in valor &&
          typeof valor.duracaoMs === "number"
        )
          logs.push({
            rota: valor.rota,
            cache: valor.cache,
            duracaoMs: valor.duracaoMs,
          });
      } catch {
        continue;
      }
    }
  });
  child.stderr?.resume();
  let fechado = false;
  async function fechar() {
    if (fechado) return;
    fechado = true;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error("Servidor de medicao nao encerrou"));
      }, 10000);
      child.once("close", (code) => {
        clearTimeout(timer);
        if (code) reject(new Error("Servidor de medicao falhou"));
        else resolve();
      });
      child.send({ tipo: "fechar" });
    });
  }
  try {
    const origem = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Servidor de medicao nao iniciou")),
        30000,
      );
      child.once("error", () => {
        clearTimeout(timer);
        reject(new Error("Servidor de medicao indisponivel"));
      });
      child.once("exit", () => {
        clearTimeout(timer);
        reject(new Error("Servidor de medicao encerrou"));
      });
      child.once("message", (message: unknown) => {
        clearTimeout(timer);
        if (
          typeof message === "object" &&
          message !== null &&
          "origem" in message &&
          typeof message.origem === "string" &&
          /^http:\/\/127\.0\.0\.1:\d+$/.test(message.origem)
        )
          resolve(message.origem);
        else reject(new Error("Origem de medicao invalida"));
      });
    });
    return {
      origem,
      logs,
      fechar,
      async invalidar(artesaoId: string) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error("Invalidacao de medicao nao confirmou")),
            10000,
          );
          child.once("message", () => {
            clearTimeout(timer);
            resolve();
          });
          child.send({ tipo: "invalidar", artesaoId });
        });
      },
    };
  } catch {
    child.kill();
    throw new Error("Falha ao preparar API isolada para medicao");
  }
}

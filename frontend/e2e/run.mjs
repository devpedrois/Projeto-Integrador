import { randomUUID, randomBytes } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import console from "node:console";
import { sanitizeArtifacts } from "./sanitize-traces.mjs";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const id = randomUUID().replaceAll("-", "");
const artifacts = resolve(
  process.env.E2E_ARTIFACT_DIR ?? resolve(frontend, "test-results"),
  id,
);
const env = {
  ...process.env,
  E2E_RUN_ID: id,
  RECOMENDACAO_SERVICE_TOKEN: randomBytes(32).toString("hex"),
  E2E_RECOMENDACAO_LOG: resolve(artifacts, "recomendacao.log"),
  E2E_ARTIFACT_DIR: artifacts,
  E2E_RUNTIME_FILE: resolve(artifacts, "runtime.json"),
};
mkdirSync(artifacts, { recursive: true });
function verificarChamadasMicrosservico() {
  const calls = readFileSync(env.E2E_RECOMENDACAO_LOG, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  if (
    !calls.some(
      (call) =>
        call.method === "GET" &&
        call.path === "/recomendacoes" &&
        call.status === 200,
    )
  )
    throw new Error("Microsservico nao recebeu recomendacoes E2E");
  return calls;
}
let code = 1;
try {
  const child = spawn(
    process.execPath,
    [
      resolve(frontend, "node_modules/@playwright/test/cli.js"),
      "test",
      ...process.argv.slice(2),
    ],
    { cwd: frontend, env, stdio: "inherit", windowsHide: true },
  );
  code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (status) => resolve(status ?? 1));
  });
} catch {
  console.error("Falha ao executar Playwright.");
} finally {
  if (existsSync(env.E2E_RUNTIME_FILE)) {
    try {
      const result = execFileSync(
        process.execPath,
        ["--import", "tsx", "scripts/e2e-server.ts", "--cleanup"],
        {
          cwd: resolve(frontend, "../backend"),
          env,
          encoding: "utf8",
          windowsHide: true,
        },
      );
      process.stdout.write(result);
    } catch {
      console.error("Falha na limpeza do schema E2E.");
      code = 1;
    }
  }
  try {
    const calls = verificarChamadasMicrosservico();
    console.log(`Chamadas ao microsservico E2E: ${calls.length}`);
  } catch {
    console.error("Log do microsservico sem chamadas E2E validas.");
    code = 1;
  }
  try {
    const count = sanitizeArtifacts(artifacts);
    console.log(`Traces ZIP sanitizados: ${count}`);
  } catch {
    console.error("Falha ao sanitizar traces E2E.");
    code = 1;
  }
}
console.log(`Relatorio E2E: ${resolve(artifacts, "html/index.html")}`);
process.exitCode = code;

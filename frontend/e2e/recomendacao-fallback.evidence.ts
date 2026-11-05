import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { setTimeout } from "node:timers/promises";
import type {
  Browser,
  BrowserType,
  BrowserContext,
  Page,
  Response,
} from "playwright-core";
import { createApp } from "../../backend/src/app.js";
import { runSeed } from "../../backend/prisma/seed.js";
import { criarBancoAuth } from "../../backend/tests/helpers/auth-database.js";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright") as {
  chromium: BrowserType;
};
const pasta = fileURLToPath(
  new URL("../../evidencias/PI4-36/36.1-fallback-local/", import.meta.url),
);
let banco: Awaited<ReturnType<typeof criarBancoAuth>> | undefined;
let api: Server | undefined;
let frontend: ChildProcess | undefined;
let browser: Browser | undefined;

try {
  await mkdir(pasta, { recursive: true });
  banco = await criarBancoAuth();
  await banco.prisma.$transaction((tx) => runSeed(tx), { timeout: 120000 });
  const produto = await banco.prisma.produto.findFirstOrThrow({
    where: { nome: "Boneca de Barro Pintada" },
  });
  const parado = createServer();
  await new Promise<void>((resolve) => parado.listen(0, "127.0.0.1", resolve));
  const portaParada = parado.address();
  if (!portaParada || typeof portaParada === "string")
    throw new Error("Porta ausente");
  await new Promise<void>((resolve) => parado.close(() => resolve()));
  api = createApp(
    banco.prisma,
    {
      COOKIE_SECURE: false,
      RECOMENDACAO_URL: `http://127.0.0.1:${portaParada.port}`,
      RECOMENDACAO_SERVICE_TOKEN:
        "synthetic-evidence-service-token-with-32-characters",
      RECOMENDACAO_TIMEOUT_MS: 800,
    },
    { logCache: () => {} },
  ).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => api?.once("listening", resolve));
  const portaApi = api.address();
  if (!portaApi || typeof portaApi === "string")
    throw new Error("Porta ausente");
  const origem = "http://127.0.0.1:3118";
  frontend = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3118",
    ],
    {
      cwd: fileURLToPath(new URL("../../frontend/", import.meta.url)),
      windowsHide: true,
      stdio: "ignore",
      env: {
        ...process.env,
        NODE_ENV: "development",
        NEXT_PUBLIC_DATA_SOURCE: "http",
        BACKEND_URL: `http://127.0.0.1:${portaApi.port}`,
      },
    },
  );
  let pronto = false;
  for (let tentativa = 0; tentativa < 90; tentativa++) {
    if (frontend.exitCode !== null) throw new Error("Frontend encerrou");
    pronto = await fetch(origem, { signal: AbortSignal.timeout(1500) })
      .then((r) => r.ok)
      .catch(() => false);
    if (pronto) break;
    await setTimeout(1000);
  }
  assert(pronto, "Frontend indisponivel");
  browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const resultados = [];
  for (const largura of [1280, 360]) {
    const context: BrowserContext = await browser.newContext({
      viewport: { width: largura, height: 900 },
      locale: "pt-BR",
    });
    const page: Page = await context.newPage();
    await page.goto(origem);
    await page
      .getByRole("button", { name: "Continuar como visitante", exact: true })
      .click();
    for (let tentativa = 1; tentativa <= 5; tentativa++) {
      const resposta: Promise<Response> = page.waitForResponse((r) => {
        const url = new URL(r.url());
        return (
          url.pathname === "/api/recomendacoes" &&
          url.searchParams.get("produtoId") === produto.id
        );
      });
      await page.goto(`${origem}/produto/${produto.id}`);
      const response: Response = await resposta;
      assert.equal(response.status(), 200);
      const body = (await response.json()) as {
        estrategia: string;
        itens: { id: string }[];
      };
      assert.equal(body.estrategia, "fallback-local");
      assert.equal(body.itens.length, 8);
      assert(!body.itens.some((p) => p.id === produto.id));
      assert.equal(response.headers()["x-cache"], "MISS");
      const area = page.getByRole("region", {
        name: "Peças relacionadas",
        exact: true,
      });
      await area.getByRole("listitem").nth(7).waitFor({ state: "attached" });
      assert.equal(await area.getByRole("listitem").count(), 8);
      assert.equal(await area.getByRole("alert").count(), 0);
      resultados.push({
        largura,
        tentativa,
        status: response.status(),
        cache: response.headers()["x-cache"],
        ...body,
      });
      if (tentativa === 1 || tentativa === 5) {
        await page.waitForLoadState("networkidle");
        await area.scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `${pasta}/produto-${largura}-${tentativa}.png`,
          fullPage: true,
        });
      }
    }
    await context.close();
  }
  await writeFile(
    `${pasta}/tela-network.json`,
    JSON.stringify(
      {
        microsservico: "desligado",
        banco: "PostgreSQL real em schema isolado",
        resultados,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("Recomendacoes preenchidas: 5/5 desktop e 5/5 mobile.");
} catch (error) {
  console.error(
    error instanceof assert.AssertionError
      ? error.message
      : "Falha na validacao visual do fallback.",
  );
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (frontend && frontend.exitCode === null) {
    const encerrado = new Promise<void>((resolve) =>
      frontend?.once("exit", () => resolve()),
    );
    frontend.kill();
    await encerrado;
  }
  if (api) {
    api.closeAllConnections();
    await new Promise<void>((resolve) => api?.close(() => resolve()));
  }
  await banco?.fechar();
  if (banco)
    await writeFile(
      `${pasta}/limpeza.json`,
      JSON.stringify({ schemaRemovido: true }) + "\n",
    );
}

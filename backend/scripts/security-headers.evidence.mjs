import "dotenv/config";
import process from "node:process";
import console from "node:console";
import { Buffer } from "node:buffer";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { setTimeout } from "node:timers/promises";
import express from "express";
import { createApp } from "../src/app.js";
import { criarBancoAuth } from "../tests/helpers/auth-database.js";
import { runSeed } from "../prisma/seed.js";
const require = createRequire(import.meta.url);
const { chromium } = require("../../frontend/node_modules/playwright");
const root = fileURLToPath(new URL("../../", import.meta.url));
const evidence = resolve(root, "evidencias/PI4-32/32.5-headers", randomUUID());
const origin = "http://127.0.0.1:3115";
const consoleMessages = [];
const violations = [];
const documents = [];
const flows = [];
let database;
let api;
let frontend;
let browser;
async function ready() {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (frontend?.exitCode !== null)
      throw new Error("Next start encerrou antes da validação.");
    const response = await globalThis.fetch(origin).catch(() => undefined);
    if (response?.ok) return;
    await setTimeout(500);
  }
  throw new Error("Next start indisponível.");
}
async function capture(page, width, flow) {
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: join(evidence, `${width}-${flow}.png`),
    fullPage: true,
  });
  flows.push({ width, flow });
}
async function login(page, email, senha, target) {
  await page.goto(`/login?retorno=${encodeURIComponent(target)}`);
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(`${origin}${target}`);
}
async function execute() {
  await mkdir(evidence, { recursive: true });
  console.log("Preparando schema temporário no PostgreSQL real.");
  database = await criarBancoAuth();
  console.log("Carregando dados sintéticos no schema isolado.");
  await database.prisma.$transaction((tx) => runSeed(tx), { timeout: 120000 });
  const storage = join(evidence, ".audit-private/fotos");
  const app = createApp(
    database.prisma,
    { JWT_SECRET: randomUUID(), COOKIE_SECURE: false },
    {
      fotoStorage: {
        async salvar(path, bytes) {
          const target = join(storage, path);
          await mkdir(dirname(target), { recursive: true });
          await writeFile(target, bytes, { flag: "wx" });
          return `/api/csp-fotos/${path}`;
        },
        async remover() {
          throw new Error("A evidência usa somente novas fotos.");
        },
      },
    },
  );
  app.use("/csp-fotos", express.static(storage));
  api = app.listen(3415, "127.0.0.1");
  await new Promise((resolve, reject) => {
    api.once("listening", resolve);
    api.once("error", reject);
  });
  frontend = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3115",
    ],
    {
      cwd: join(root, "frontend"),
      windowsHide: true,
      stdio: "ignore",
      env: {
        ...process.env,
        NODE_ENV: "production",
        NEXT_PUBLIC_DATA_SOURCE: "http",
        BACKEND_URL: "http://127.0.0.1:3415",
      },
    },
  );
  await ready();
  console.log("Next start pronto. Iniciando navegação com console monitorado.");
  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.E2E_CHROMIUM_EXECUTABLE_PATH ??
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  for (const width of [360, 1280]) {
    await database.prisma.perfilArtesao.updateMany({ data: { foto: null } });
    const context = await browser.newContext({
      baseURL: origin,
      viewport: { width, height: 1000 },
      locale: "pt-BR",
    });
    await context.exposeBinding("recordCspViolation", (_source, violation) => {
      violations.push({ width, violation });
    });
    await context.addInitScript(() => {
      globalThis.document.addEventListener(
        "securitypolicyviolation",
        (event) => {
          const record = globalThis.recordCspViolation;
          void record({
            directive: event.effectiveDirective,
            blockedURI: event.blockedURI,
            disposition: event.disposition,
          });
        },
      );
    });
    const page = await context.newPage();
    page.on("console", (message) =>
      consoleMessages.push({
        width,
        type: message.type(),
        text: message.text(),
      }),
    );
    page.on("pageerror", (error) =>
      consoleMessages.push({ width, type: "pageerror", text: error.message }),
    );
    page.on("response", (response) => {
      if (response.request().resourceType() === "document") {
        const headers = response.headers();
        documents.push({
          path: new URL(response.url()).pathname,
          status: response.status(),
          headers: Object.fromEntries(
            [
              "content-security-policy",
              "x-content-type-options",
              "referrer-policy",
              "permissions-policy",
            ].map((name) => [name, headers[name] ?? ""]),
          ),
        });
      }
    });
    await page.goto("/");
    await page
      .getByRole("button", { name: "Continuar como visitante", exact: true })
      .click();
    const product = page
      .getByRole("link", { name: "Boneca de Barro Pintada", exact: true })
      .first();
    await product.waitFor();
    await capture(page, width, "vitrine");
    await product.click();
    await page
      .getByRole("heading", {
        name: "Boneca de Barro Pintada",
        exact: true,
        level: 1,
      })
      .waitFor();
    const productPath = new URL(page.url()).pathname;
    await capture(page, width, "produto");
    const email = `csp-${randomUUID()}@teste.origem`;
    const senha = `Csp!${randomUUID()}`;
    const registered = await page.request.post("/api/auth/register", {
      data: {
        nome: "Comprador sintético CSP",
        email,
        senha,
        papel: "comprador",
      },
    });
    assert.equal(registered.status(), 201);
    await page.request.post("/api/auth/logout");
    await page.goto("/login");
    await page.getByLabel("E-mail", { exact: true }).waitFor();
    await capture(page, width, "login");
    await login(page, email, senha, productPath);
    await page
      .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
      .first()
      .click();
    await page
      .getByRole("link", { name: /^Carrinho/ })
      .first()
      .click();
    await page
      .getByRole("heading", { name: "Seu carrinho", exact: true })
      .waitFor();
    await page
      .getByRole("main")
      .getByText("Boneca de Barro Pintada", { exact: true })
      .waitFor();
    await capture(page, width, "carrinho");
    await page
      .getByRole("link", { name: "Finalizar compra", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Revisar e confirmar pedido" })
      .waitFor();
    await capture(page, width, "checkout");
    await page
      .getByRole("button", { name: "Confirmar pedido", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Pedido confirmado", exact: true })
      .waitFor();
    await capture(page, width, "pedido-confirmado");
    await page.request.post("/api/auth/logout");
    await login(
      page,
      "joao.artesao@origem.test",
      "senha-sintetica-artesao",
      "/painel-artesao",
    );
    await capture(page, width, "artesao");
    await page.goto("/painel-artesao/perfil");
    await page.getByLabel("Foto do perfil", { exact: false }).setInputFiles({
      name: "foto-csp.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aA6sAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    const preview = page
      .getByRole("complementary", { name: "Prévia do perfil público" })
      .locator("img");
    await preview.waitFor();
    await page.waitForFunction(() =>
      Boolean(
        globalThis.document.querySelector('img[src^="blob:"]')?.naturalWidth,
      ),
    );
    await capture(page, width, "foto-previa");
    const uploaded = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/artesao/perfil/foto" &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Salvar perfil", exact: true })
      .click();
    assert.equal((await uploaded).status(), 200);
    await page
      .getByText("Perfil salvo com sucesso.", { exact: true })
      .waitFor();
    await page.waitForFunction(() =>
      Boolean(
        globalThis.document.querySelector('img[src^="/api/csp-fotos/"]')
          ?.naturalWidth,
      ),
    );
    await capture(page, width, "foto-enviada");
    await page.request.post("/api/auth/logout");
    await login(page, "admin@origem.test", "senha-sintetica-admin", "/admin");
    await page
      .getByRole("region", { name: "Indicadores da plataforma" })
      .locator("time")
      .waitFor();
    await capture(page, width, "admin");
    await context.close();
  }
  for (const document of documents) {
    assert.ok(
      document.headers["content-security-policy"].includes(
        "default-src 'self'",
      ),
    );
    assert.ok(
      !document.headers["content-security-policy"].includes("unsafe-eval"),
    );
    assert.equal(document.headers["x-content-type-options"], "nosniff");
    assert.equal(
      document.headers["referrer-policy"],
      "strict-origin-when-cross-origin",
    );
    assert.ok(document.headers["permissions-policy"].includes("camera=()"));
  }
  assert.equal(violations.length, 0);
  assert.equal(
    consoleMessages.filter((message) =>
      /content.security.policy|violat.*(?:csp|directive)|refused to/i.test(
        message.text,
      ),
    ).length,
    0,
  );
  const report = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
  });
  await report.setContent(
    '<html lang="pt-BR"><title>32.5: headers e console</title><h1>32.5: produção local</h1><p>Respostas HTTP e console capturados durante os fluxos.</p><pre id="resultado"></pre></html>',
  );
  await report.locator("#resultado").evaluate(
    (element, value) => {
      element.textContent = value;
    },
    JSON.stringify(
      { flows, headers: documents[0]?.headers, violations, consoleMessages },
      null,
      2,
    ),
  );
  await report.screenshot({
    path: join(evidence, "headers-console.png"),
    fullPage: true,
  });
  await report.close();
}
try {
  await execute();
  console.log("Fluxos concluídos sem violações de CSP.");
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Falha na validação CSP.",
  );
  process.exitCode = 1;
} finally {
  if (process.exitCode === 1 && browser) {
    const page = browser.contexts().at(-1)?.pages().at(-1);
    await page?.screenshot({
      path: join(evidence, "falha.png"),
      fullPage: true,
    });
  }
  await browser?.close();
  if (frontend && frontend.exitCode === null) {
    const exited = new Promise((resolve) =>
      frontend.once("exit", () => resolve()),
    );
    frontend.kill();
    await exited;
  }
  if (api) {
    api.closeAllConnections();
    await new Promise((resolve, reject) =>
      api.close((error) => (error ? reject(error) : resolve())),
    );
  }
  await database?.fechar();
  await writeFile(
    join(evidence, "resultado.json"),
    JSON.stringify(
      {
        mode: "next build + next start; API e PostgreSQL reais; schema isolado; upload em disco via mesma origem",
        flows,
        documents,
        violations,
        consoleMessages,
        success: process.exitCode !== 1,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  console.log(`Evidências: ${evidence}`);
}

import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import console from "node:console";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { URL } from "node:url";
import { chromium } from "playwright";

const origin = "https://origem-marketplace.vercel.app";
const folder = resolve(
  "../evidencias/PI4-32/32.5-headers/producao",
  randomUUID(),
);
const violations = [];
const messages = [];
const headers = [];
const flows = [];
const uploads = [];
let browser;
await mkdir(folder, { recursive: true });

async function capture(page, width, flow) {
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: resolve(folder, `${width}-${flow}.png`),
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

async function register(page, papel) {
  const email = `csp32-${randomUUID()}@teste.origem`;
  const senha = `Csp!${randomUUID()}`;
  const response = await page.request.post("/api/auth/register", {
    data: { nome: `Validação CSP ${papel}`, email, senha, papel },
  });
  assert.equal(response.status(), 201);
  await page.request.post("/api/auth/logout");
  return { email, senha };
}

try {
  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.E2E_CHROMIUM_EXECUTABLE_PATH ??
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  for (const width of [360, 1280]) {
    const context = await browser.newContext({
      baseURL: origin,
      viewport: { width, height: 1000 },
      locale: "pt-BR",
    });
    await context.exposeBinding("recordCspViolation", (_source, event) =>
      violations.push({ width, event }),
    );
    await context.addInitScript(() =>
      globalThis.document.addEventListener(
        "securitypolicyviolation",
        (event) => {
          void globalThis.recordCspViolation({
            directive: event.effectiveDirective,
            blockedURI: event.blockedURI,
          });
        },
      ),
    );
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.on("console", (message) =>
      messages.push({ width, type: message.type(), text: message.text() }),
    );
    page.on("pageerror", (error) =>
      messages.push({ width, type: "pageerror", text: error.message }),
    );
    page.on("response", (response) => {
      if (response.request().resourceType() === "document") {
        const values = response.headers();
        headers.push({
          path: new URL(response.url()).pathname,
          status: response.status(),
          headers: Object.fromEntries(
            [
              "content-security-policy",
              "x-content-type-options",
              "referrer-policy",
              "permissions-policy",
            ].map((name) => [name, values[name] ?? ""]),
          ),
        });
      }
    });
    const productsResponse = await page.request.get("/api/produtos");
    assert.equal(productsResponse.status(), 200);
    const products = await productsResponse.json();
    const product = products.find((item) => item.quantidadeEstoque > 0);
    assert.ok(product);
    await page.goto("/");
    await page
      .getByRole("button", { name: "Continuar como visitante", exact: true })
      .click();
    await page
      .getByRole("link", { name: product.nome, exact: true })
      .first()
      .waitFor();
    await page.waitForFunction(() =>
      [...globalThis.document.images].some(
        (image) =>
          image.src.includes(
            "peqzo3marpkt7bsh.public.blob.vercel-storage.com",
          ) && image.naturalWidth > 0,
      ),
    );
    await capture(page, width, "vitrine");
    await page
      .getByRole("link", { name: product.nome, exact: true })
      .first()
      .click();
    await page
      .getByRole("heading", { name: product.nome, exact: true, level: 1 })
      .waitFor();
    await capture(page, width, "produto");
    const buyer = await register(page, "comprador");
    await page.goto("/login");
    await page.getByLabel("E-mail", { exact: true }).waitFor();
    await capture(page, width, "login");
    await login(
      page,
      buyer.email,
      buyer.senha,
      `/produto/${encodeURIComponent(product.id)}`,
    );
    const added = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/carrinho/itens" &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
      .first()
      .click();
    assert.equal((await added).status(), 200);
    await page
      .getByRole("link", { name: /^Carrinho/ })
      .first()
      .click();
    await page
      .getByRole("heading", { name: "Seu carrinho", exact: true })
      .waitFor();
    await capture(page, width, "carrinho");
    await page
      .getByRole("link", { name: "Finalizar compra", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Revisar e confirmar pedido" })
      .waitFor();
    await capture(page, width, "checkout");

    await page.request.post("/api/auth/logout");
    const artisan = await register(page, "artesao");
    await login(page, artisan.email, artisan.senha, "/painel-artesao");
    await capture(page, width, "artesao");
    await page.goto("/painel-artesao/perfil");
    await page
      .getByLabel("História", { exact: true })
      .fill("Perfil sintético para validar headers e CSP da subtarefa 32.5.");
    await page
      .getByLabel("Técnica principal", { exact: true })
      .selectOption({ index: 1 });
    await page.getByLabel("Região", { exact: true }).selectOption({ index: 1 });
    await page.getByLabel("Foto do perfil", { exact: false }).setInputFiles({
      name: "foto-csp.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aA6sAAAAASUVORK5CYII=",
        "base64",
      ),
    });
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
    const uploadResponse = await uploaded;
    uploads.push({ width, status: uploadResponse.status() });
    if (uploadResponse.status() === 200) {
      await page
        .getByText("Perfil salvo com sucesso.", { exact: true })
        .waitFor();
      await page.waitForFunction(() =>
        Boolean(
          globalThis.document.querySelector(
            'img[src^="https://peqzo3marpkt7bsh.public.blob.vercel-storage.com/perfis/"]',
          )?.naturalWidth,
        ),
      );
    } else {
      assert.equal(uploadResponse.status(), 503);
      await page
        .getByText(
          "Não foi possível salvar seu perfil. Tente novamente em instantes.",
          { exact: true },
        )
        .waitFor();
    }
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
  for (const entry of headers) {
    assert.ok(
      entry.headers["content-security-policy"].includes("default-src 'self'"),
    );
    assert.ok(
      entry.headers["content-security-policy"].includes(
        "frame-ancestors 'none'",
      ),
    );
    assert.ok(
      !entry.headers["content-security-policy"].includes("unsafe-eval"),
    );
    assert.equal(entry.headers["x-content-type-options"], "nosniff");
    assert.equal(
      entry.headers["referrer-policy"],
      "strict-origin-when-cross-origin",
    );
    assert.ok(entry.headers["permissions-policy"].includes("camera=()"));
  }
  assert.equal(violations.length, 0);
  assert.equal(
    messages.filter((message) =>
      /content.security.policy|violat.*(?:csp|directive)|refused to/i.test(
        message.text,
      ),
    ).length,
    0,
  );
  console.log("Headers públicos confirmados; zero violações CSP.");
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Falha na validação pública.",
  );
  process.exitCode = 1;
  const page = browser?.contexts().at(-1)?.pages().at(-1);
  await page?.screenshot({
    path: resolve(folder, "falha.png"),
    fullPage: true,
  });
} finally {
  await browser?.close();
  await writeFile(
    resolve(folder, "resultado.json"),
    JSON.stringify(
      {
        origin,
        flows,
        headers,
        violations,
        messages,
        uploads,
        success: process.exitCode !== 1,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  console.log(`Evidências públicas: ${folder}`);
}

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath, URL } from "node:url";
import { setTimeout } from "node:timers/promises";
import console from "node:console";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const output = new URL(
  "../../../evidencias/PI4-35/35.5-comunicacao/",
  import.meta.url,
);
const require = createRequire(
  new URL("../../../frontend/package.json", import.meta.url),
);
const { chromium } = require("playwright");
const origin = "http://127.0.0.1:3119";
const project = "origem-35-5";
const { fetch } = globalThis;

function compose(...args) {
  const result = spawnSync(
    "docker",
    ["compose", "-p", project, "--env-file", ".env.compose.example", ...args],
    {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      timeout: 120000,
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    console.error(result.stderr);
    throw new Error("Comando Docker Compose falhou");
  }
  return result.stdout;
}

function snapshot(pedidoId) {
  return JSON.parse(
    compose(
      "exec",
      "-T",
      "api",
      "node",
      "--input-type=module",
      "-e",
      `
    import { Pool } from 'pg';
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const result = await pool.query(\`
        SELECT p.id AS "pedidoId", p.status AS "pedidoStatus",
          i.id AS "intencaoId", i.status AS "intencaoStatus", i.tentativas,
          (SELECT count(*)::int FROM "Notificacao" n WHERE n."pedidoId" = p.id) AS notificacoes,
          (SELECT json_agg(json_build_object('jobId', j.id, 'fila', j.name, 'estado', j.state))
            FROM pgboss.job j WHERE j.data->>'pedidoId' = p.id::text) AS jobs
        FROM "Pedido" p JOIN "IntencaoNotificacao" i ON i."pedidoId" = p.id
        WHERE p.id = $1\`, [process.argv[1]]);
      process.stdout.write(JSON.stringify(result.rows[0]));
    } finally { await pool.end(); }
  `,
      pedidoId,
    ),
  );
}

async function until(check) {
  for (let i = 0; i < 60; i++) {
    const result = await check();
    if (result) return result;
    await setTimeout(500);
  }
  throw new Error("Fluxo nao terminou em 30 segundos");
}

function logs(service) {
  return compose("logs", "--no-color", "--no-log-prefix", service)
    .split(/\r?\n/)
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line));
}

const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
async function printLogs(page, name, title, panels) {
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>${escape(title)}</title>
  <style>body{margin:0;padding:40px;background:#101820;color:#eef3f6;font:20px system-ui}h1{font-size:30px}h2{font-size:22px;color:#95ddbf}section{display:grid;grid-template-columns:1fr 1fr;gap:24px}article{background:#192630;padding:24px;border:1px solid #44616e;border-radius:8px}pre{font:17px/1.6 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}footer{margin-top:24px;color:#b8c9d0}</style>
  <h1>${escape(title)}</h1><section>${panels.map(([label, entries]) => `<article><h2>${escape(label)}</h2>${entries.map((entry) => `<pre>${escape(JSON.stringify(entry))}</pre>`).join("")}</article>`).join("")}</section>
  <footer>Origem · 35.5 · Captura local dos logs reais e consultas parametrizadas · Docker Compose ${project}</footer></html>`;
  await writeFile(new URL(`${name}.html`, output), html);
  await page.setContent(html);
  await page.screenshot({
    path: fileURLToPath(new URL(`${name}.png`, output)),
    fullPage: true,
  });
}

await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  locale: "pt-BR",
});
let workerStopped = false;
try {
  const page = await context.newPage();
  await page.goto(origin);
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("button", { name: "Continuar como visitante", exact: true })
    .click();
  const product = page
    .getByRole("link", { name: "Boneca de Barro Pintada", exact: true })
    .first();
  await product.waitFor({ state: "visible" });
  const restResponse = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/recomendacoes" &&
      r.request().method() === "GET",
  );
  await product.click();
  const rest = await restResponse;
  assert.equal(rest.status(), 200);
  assert.equal(rest.headers()["x-cache"], "MISS");
  const requestId = rest.headers()["x-request-id"];
  assert.match(requestId, /^[a-f0-9-]{36}$/i);
  const recommendation = await rest.json();
  assert.notEqual(recommendation.estrategia, "fallback-local");
  const related = page.getByRole("region", {
    name: "Peças relacionadas",
    exact: true,
  });
  await related.getByRole("listitem").nth(7).waitFor({ state: "attached" });
  await page.waitForLoadState("networkidle");
  await related.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: fileURLToPath(new URL("01-vitrine-rest.png", output)),
    fullPage: true,
  });
  const apiRest = logs("api").filter(
    (r) => r.requestId === requestId && r.status === 200,
  );
  const microRest = logs("recomendacao").filter(
    (r) => r.requestId === requestId && r.status === 200,
  );
  assert.equal(apiRest.length, 1);
  assert.equal(microRest.length, 1);
  assert.equal(apiRest[0].rota, "/recomendacoes");
  assert.equal(microRest[0].rota, "/recomendacoes");

  const productPath = new URL(page.url()).pathname;
  await page.goto(`${origin}/login`);
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("ana.compradora@origem.test");
  await page
    .getByLabel("Senha", { exact: true })
    .fill("senha-sintetica-comprador");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(origin + "/");
  await page.goto(origin + productPath);
  const cart = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/carrinho/itens" &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
    .first()
    .click();
  assert((await cart).ok());
  await page
    .getByRole("link", { name: /^Carrinho/ })
    .first()
    .click();
  await page
    .getByRole("heading", { name: "Seu carrinho", exact: true })
    .waitFor();
  await page
    .getByRole("link", { name: "Finalizar compra", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Revisar e confirmar pedido" })
    .waitFor();
  compose("stop", "worker");
  workerStopped = true;
  let orderResponse;
  let pedidoId;
  let before;
  try {
    const created = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/api/pedidos" &&
        r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Confirmar pedido", exact: true })
      .click();
    orderResponse = await created;
    assert.equal(orderResponse.status(), 201);
    pedidoId = (await orderResponse.json()).pedido.id;
    assert.match(pedidoId, /^[a-f0-9-]{36}$/i);
    before = await until(() => {
      const state = snapshot(pedidoId);
      return state.intencaoStatus === "publicada" && state.jobs?.length > 0
        ? state
        : false;
    });
    assert.equal(before.tentativas, 0);
    assert.equal(before.notificacoes, 0);
    await page
      .getByRole("heading", { name: "Pedido confirmado", exact: true })
      .waitFor();
    await page.screenshot({
      path: fileURLToPath(new URL("02-checkout-confirmado.png", output)),
      fullPage: true,
    });
  } finally {
    compose("start", "worker");
    workerStopped = false;
  }
  const after = await until(() => {
    const state = snapshot(pedidoId);
    return state.intencaoStatus === "processada" &&
      state.notificacoes === 1 &&
      state.jobs?.every((j) => j.estado === "completed")
      ? state
      : false;
  });
  const worker = logs("worker").filter((r) => r.pedidoId === pedidoId);
  assert.deepEqual(worker, [
    {
      servico: "worker",
      job: "notificar-artesao",
      pedidoId,
      tentativa: 1,
      resultado: "sucesso",
    },
  ]);
  const checkout = logs("api").filter(
    (r) => r.requestId === orderResponse.headers()["x-request-id"],
  );
  assert.equal(checkout.length, 1);
  assert.equal(checkout[0].status, 201);
  assert.equal(checkout[0].rota, "/pedidos");
  const invalid = await fetch("http://127.0.0.1:3001/recomendacoes", {
    headers: { "X-Request-Id": "id-invalido" },
  });
  assert.equal(invalid.status, 200);
  assert.match(invalid.headers.get("x-request-id"), /^[a-f0-9-]{36}$/i);
  await invalid.arrayBuffer();
  const services = await until(() => {
    const states = JSON.parse(
      `[${compose("ps", "--format", "json").trim().split(/\r?\n/).join(",")}]`,
    ).map(({ Service, State, Health }) => ({
      servico: Service,
      estado: State,
      saude: Health,
    }));
    return states.length === 4 &&
      states.every((state) => state.saude === "healthy")
      ? states
      : false;
  });
  const captured = {
    data: new Date().toISOString(),
    compose: project,
    servicos: services,
    rest: {
      requestId,
      estrategia: recommendation.estrategia,
      itens: recommendation.itens.length,
      api: apiRest[0],
      microsservico: microRest[0],
    },
    mensageria: {
      pedidoId,
      api: checkout[0],
      antesDoWorker: before,
      depoisDoWorker: after,
      worker: worker[0],
    },
    headerInvalidoSubstituido: {
      recebido: "id-invalido",
      devolvido: invalid.headers.get("x-request-id"),
    },
  };
  const runtime = Object.fromEntries(
    ["api", "recomendacao", "worker"].map((service) => [
      service,
      compose("logs", "--no-color", "--no-log-prefix", service),
    ]),
  );
  const forbidden = (
    await readFile(
      new URL("../../../.env.compose.example", import.meta.url),
      "utf8",
    )
  )
    .split(/\r?\n/)
    .filter((line) => /PASSWORD=|JWT_SECRET=|SERVICE_TOKEN=/.test(line))
    .map((line) => line.slice(line.indexOf("=") + 1));
  const serialized = JSON.stringify({ runtime, captured });
  assert(
    !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized),
    "Email encontrado nos logs",
  );
  for (const value of [
    ...forbidden,
    "ana.compradora@origem.test",
    "senha-sintetica-comprador",
    "origem_sessao=",
    "produtoId=",
    "usuarioId=",
    "Bearer ",
  ])
    assert(!serialized.includes(value), "Dado sensivel encontrado nos logs");
  for (const [service, content] of Object.entries(runtime))
    await writeFile(new URL(`logs-${service}.txt`, output), content);
  await writeFile(
    new URL("fluxos.json", output),
    JSON.stringify(captured, null, 2) + "\n",
  );
  const display = await context.newPage();
  await display.setViewportSize({ width: 1800, height: 900 });
  await printLogs(
    display,
    "03-logs-rest",
    "Vitrine → API → microsserviço: mesmo requestId",
    [
      ["Container API", apiRest],
      ["Container recomendacao", microRest],
    ],
  );
  await printLogs(
    display,
    "04-logs-mensageria",
    "Checkout → intenção → fila → worker: mesmo pedidoId",
    [
      ["API e fila antes do worker", [checkout[0], before]],
      ["Worker e intenção processada", [worker[0], after]],
    ],
  );
  console.log(
    JSON.stringify({
      requestId,
      pedidoId,
      rest: "correlacionado",
      mensageria: "processada",
      logs: "sem dados sensiveis",
    }),
  );
} finally {
  if (workerStopped) compose("start", "worker");
  await context.close();
  await browser.close();
}

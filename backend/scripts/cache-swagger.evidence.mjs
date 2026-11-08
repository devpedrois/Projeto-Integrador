import "dotenv/config";
import assert from "node:assert/strict";
import console from "node:console";
import process from "node:process";
import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { criarBancoRecomendacao } from "../tests/helpers/recomendacao-database.js";

const require = createRequire(import.meta.url);
const { chromium } = require("../../frontend/node_modules/playwright");
const destino = fileURLToPath(
  new URL(
    `../../evidencias/PI4-32/32.6-cache-swagger/${randomUUID()}/`,
    import.meta.url,
  ),
);
const registros = [];
const chamadas = [];
const servidores = [];
const secret = randomUUID();
let banco;
let browser;

async function salvar(nome, valor) {
  await writeFile(
    resolve(destino, nome),
    JSON.stringify(valor, null, 2) + "\n",
    {
      flag: "wx",
    },
  );
}

async function iniciar() {
  const app = createApp(
    banco.prisma,
    {
      JWT_SECRET: secret,
      COOKIE_SECURE: false,
      CACHE_TTL_SECONDS: 60,
      ...banco.environment,
    },
    {
      logCache(registro) {
        registros.push(registro);
        console.info(JSON.stringify(registro));
      },
    },
  );
  const servidor = createServer(app);
  servidores.push(servidor);
  await new Promise((resolve, reject) => {
    servidor.once("error", reject);
    servidor.listen(0, "127.0.0.1", resolve);
  });
  const address = servidor.address();
  assert(address && typeof address !== "string");
  return { app, origin: `http://127.0.0.1:${address.port}` };
}

function cookie(usuario) {
  return `origem_sessao=${jwt.sign(
    { nome: usuario.nome, papel: usuario.papel },
    secret,
    {
      subject: usuario.id,
      expiresIn: "1h",
    },
  )}`;
}

async function chamar(api, cenario, rota, options = {}) {
  const response = await globalThis.fetch(api.origin + rota, options);
  const body = await response.json();
  chamadas.push({
    cenario,
    metodo: options.method ?? "GET",
    rota,
    status: response.status,
    headers: Object.fromEntries(
      ["x-cache", "server-timing", "cache-control"].map((key) => [
        key,
        response.headers.get(key),
      ]),
    ),
    estrategia: body.estrategia ?? null,
    quantidade: Array.isArray(body)
      ? body.length
      : (body.itens?.length ?? null),
    erro: body.error ?? null,
    hashCorpo: createHash("sha256").update(JSON.stringify(body)).digest("hex"),
  });
  return { response, body };
}

async function par(api, cenario, rota, estados, options = {}) {
  const respostas = [];
  for (const estado of estados) {
    const result = await chamar(api, cenario, rota, options);
    assert.equal(result.response.status, 200);
    assert.equal(result.response.headers.get("x-cache"), estado);
    assert.equal(result.response.headers.get("cache-control"), "no-store");
    const timing = result.response.headers.get("server-timing");
    if (estado === null) assert.equal(timing, null);
    else assert.match(timing, /^cache;dur=\d+\.\d{3}$/);
    respostas.push(result.body);
  }
  return respostas;
}

function operacoes(stack) {
  return stack.flatMap((layer) => {
    if (!layer.route) return operacoes(layer.handle?.stack ?? []);
    const path = layer.route.path.replace(/:(\w+)/g, "{$1}");
    return Object.keys(layer.route.methods).map(
      (method) => `${method} ${path}`,
    );
  });
}

async function executar() {
  await mkdir(destino, { recursive: true });
  banco = await criarBancoRecomendacao();
  const usuarios = {};
  for (const papel of ["artesao", "comprador", "admin"]) {
    usuarios[papel] = await banco.prisma.usuario.create({
      data: {
        nome: `Pessoa sintetica ${papel}`,
        email: `${randomUUID()}@origem.test`,
        senhaHash: "hash-sintetico-sem-login",
        papel,
      },
    });
  }
  const categorias = await Promise.all(
    ["Categoria principal", "Categoria curta"].map((nome) =>
      banco.prisma.categoria.create({ data: { nome } }),
    ),
  );
  const produtos = [];
  for (let i = 0; i < 11; i++) {
    produtos.push(
      await banco.prisma.produto.create({
        data: {
          nome: `Peca sintetica ${i}`,
          descricao: "Massa isolada da evidencia de cache",
          preco: 25.5,
          quantidadeEstoque: 5,
          artesaoId: usuarios.artesao.id,
          categoriaId: categorias[i < 9 ? 0 : 1].id,
          tecnicaId: "tecnica-modelagem-argila",
        },
      }),
    );
  }
  const api = await iniciar();
  const ponto = produtos[0].id;
  const rotas = [
    "/produtos",
    `/produtos/${ponto}`,
    `/recomendacoes?produtoId=${ponto}`,
    "/recomendacoes",
  ];
  for (const rota of rotas) {
    const [miss, hit] = await par(api, "cache-publico", rota, ["MISS", "HIT"]);
    assert.deepEqual(hit, miss);
  }
  for (const [rota, papel] of [
    ["/recomendacoes/para-mim", "comprador"],
    ["/admin/indicadores", "admin"],
    [`/avaliacoes?produtoId=${ponto}&limit=1&offset=0`, null],
  ]) {
    await par(
      api,
      "sem-cache",
      rota,
      [null, null],
      papel ? { headers: { Cookie: cookie(usuarios[papel]) } } : {},
    );
  }
  await par(api, "cache-indicadores", "/artesao/indicadores", ["MISS", "HIT"], {
    headers: { Cookie: cookie(usuarios.artesao) },
  });
  const misto = await par(
    api,
    "selecao-parcial",
    `/recomendacoes?produtoId=${produtos[9].id}`,
    ["MISS", "MISS"],
  );
  assert(misto.every((r) => r.estrategia === "misto" && r.itens.length === 8));
  const escrita = await chamar(
    api,
    "invalida-estoque",
    `/produtos/${ponto}/estoque`,
    {
      method: "PATCH",
      headers: {
        Cookie: cookie(usuarios.artesao),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quantidadeEstoque: 4 }),
    },
  );
  assert.equal(escrita.response.status, 200);
  for (const rota of rotas)
    await par(api, "apos-invalidacao", rota, ["MISS", "HIT"]);

  const remover = await chamar(
    api,
    "item-ausente",
    `/carrinho/itens/${ponto}`,
    {
      method: "DELETE",
      headers: { Cookie: cookie(usuarios.comprador) },
    },
  );
  assert.equal(remover.response.status, 404);
  assert.equal(remover.body.error.code, "PRODUTO_NAO_ENCONTRADO");
  for (const [rota, headers, status] of [
    ["/admin/indicadores", {}, 401],
    ["/admin/indicadores", { Cookie: cookie(usuarios.comprador) }, 403],
    ["/admin/indicadores?extra=1", { Cookie: cookie(usuarios.admin) }, 400],
  ]) {
    assert.equal(
      (await chamar(api, "erro-documentado", rota, { headers })).response
        .status,
      status,
    );
  }
  const semContexto = await chamar(
    api,
    "contexto-inexistente",
    `/recomendacoes?produtoId=${randomUUID()}`,
  );
  assert.equal(semContexto.response.status, 200);
  assert.equal(semContexto.body.estrategia, "fallback-geral");

  const specification = await globalThis
    .fetch(api.origin + "/docs/openapi.json")
    .then((r) => r.json());
  const registradas = operacoes(api.app.router.stack).sort();
  const documentadas = Object.entries(specification.paths)
    .flatMap(([path, methods]) =>
      Object.keys(methods).map((method) => `${method} ${path}`),
    )
    .sort();
  assert.deepEqual(documentadas, registradas);
  await salvar("openapi.json", specification);
  await salvar("rotas.json", { registradas, documentadas, divergencias: [] });

  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.E2E_CHROMIUM_EXECUTABLE_PATH ??
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto(api.origin + "/docs/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("heading", { name: "Origem API" }).waitFor();
  await page.screenshot({
    path: resolve(destino, "swagger.png"),
    fullPage: true,
  });
  const textos = await page.getByRole("button").allTextContents();
  await salvar("swagger-botoes.json", textos);
  await browser.close();
  browser = undefined;

  await banco.micro.parar();
  const apiDegradada = await iniciar();
  const degradadas = await par(
    apiDegradada,
    "microsservico-desligado",
    "/recomendacoes",
    ["MISS", "MISS"],
  );
  assert(
    degradadas.every(
      (r) => r.estrategia === "fallback-local" && r.itens.length === 8,
    ),
  );
  await salvar("http.json", {
    capturadoEm: new Date().toISOString(),
    ambiente:
      "API e microsservico locais; PostgreSQL real; schema isolado; dados sinteticos",
    cacheTtlSeconds: 60,
    chamadas,
  });
  await writeFile(
    resolve(destino, "cache-http.txt"),
    registros.map((r) => JSON.stringify(r)).join("\n") + "\n",
    { flag: "wx" },
  );
  console.log(`EVIDENCIA_CACHE_SWAGGER=${destino}`);
}

try {
  await executar();
} catch {
  console.error("Evidencia falhou. Confira ambiente e registros de progresso.");
  process.exitCode = 1;
} finally {
  await browser?.close();
  for (const server of servidores) {
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections();
    });
  }
  if (banco) {
    await banco.fechar();
    await salvar("limpeza.json", {
      schemaIsoladoRemovido: true,
      servidoresEncerrados: true,
    });
  }
}

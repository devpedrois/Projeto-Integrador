import "dotenv/config";
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout } from "node:timers/promises";
import type { Server } from "node:http";
import type {
  Browser,
  BrowserType,
} from "../../frontend/node_modules/playwright-core/index.js";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
import { createApp } from "../src/app.js";
import { criarBancoAuth } from "../tests/helpers/auth-database.js";
import { FotoDiscoTemporario } from "../tests/helpers/foto-storage.js";

const require = createRequire(import.meta.url);
const { chromium } = require("../../frontend/node_modules/playwright") as {
  chromium: BrowserType;
};
const raizProjeto = fileURLToPath(new URL("../../", import.meta.url));
const pasta = resolve(raizProjeto, "evidencias/Web.6", randomUUID());
let banco: Awaited<ReturnType<typeof criarBancoAuth>> | undefined;
let servidor: Server | undefined;
let frontend: ChildProcess | undefined;
let browser: Browser | undefined;
let temporario: string | undefined;
let schema: string | undefined;

async function executar() {
  await mkdir(pasta, { recursive: true });
  banco = await criarBancoAuth();
  schema = (
    await banco.prisma.$queryRaw<
      { nome: string }[]
    >`SELECT current_schema() AS nome`
  )[0]?.nome;
  temporario = await mkdtemp(join(tmpdir(), "origem-web6-evidencia-"));
  const segredo = randomUUID();
  const artesao = await banco.prisma.usuario.create({
    data: {
      nome: "Artesã Sintética Web.6",
      email: `${randomUUID()}@teste.origem`,
      senhaHash: "sintetico",
      papel: "artesao",
      perfilArtesao: {
        create: {
          historia: "Cerâmica feita à mão em Pernambuco.",
          tecnicaPrincipalId: "tecnica-modelagem-argila",
          regiaoId: "regiao-alto-moura-caruaru",
          completo: true,
        },
      },
    },
  });
  const app = createApp(
    banco.prisma,
    { JWT_SECRET: segredo, COOKIE_SECURE: false },
    { fotoStorage: new FotoDiscoTemporario(temporario) },
  );
  servidor = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    servidor?.once("listening", resolve);
    servidor?.once("error", reject);
  });
  const endereco = servidor.address();
  if (!endereco || typeof endereco === "string")
    throw new Error("Porta indisponivel");
  const portaFrontend = 3116;
  frontend = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(portaFrontend),
    ],
    {
      cwd: join(raizProjeto, "frontend"),
      windowsHide: true,
      stdio: "ignore",
      env: {
        ...process.env,
        NODE_ENV: "development",
        NEXT_PUBLIC_DATA_SOURCE: "http",
        BACKEND_URL: `http://127.0.0.1:${endereco.port}`,
      },
    },
  );
  const origem = `http://127.0.0.1:${portaFrontend}`;
  let pronto = false;
  for (let tentativa = 0; tentativa < 90; tentativa++) {
    if (frontend.exitCode !== null) throw new Error("Frontend encerrou");
    try {
      pronto = (await fetch(origem, { signal: AbortSignal.timeout(1500) })).ok;
    } catch {
      pronto = false;
    }
    if (pronto) break;
    await setTimeout(1000);
  }
  if (!pronto) throw new Error("Frontend indisponivel");
  browser = await chromium.launch({
    executablePath:
      process.env.E2E_CHROMIUM_EXECUTABLE_PATH ??
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    locale: "pt-BR",
  });
  await context.addCookies([
    {
      name: "origem_sessao",
      value: jwt.sign({ papel: "artesao", nome: "Sintetico" }, segredo, {
        subject: artesao.id,
        expiresIn: "1h",
      }),
      url: origem,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const imagem = await context.newPage();
  await imagem.setContent(
    '<body style="margin:0;background:#e9c9aa;display:grid;place-items:center;height:100vh"><div style="width:180px;height:180px;border-radius:50%;background:#a95d3e"></div></body>',
  );
  const jpeg = await imagem.screenshot({ type: "jpeg" });
  const jpg = Buffer.concat([
    jpeg,
    Buffer.alloc(Math.max(0, 500 * 1024 - jpeg.length)),
  ]);
  if (jpg.length !== 500 * 1024) throw new Error("Fixture excede 500 KB");
  await imagem.close();
  await context.route("https://disco.example.test/**", async (route) => {
    const arquivo = join(
      temporario ?? "",
      new URL(route.request().url()).pathname,
    );
    await route.fulfill({
      body: await readFile(arquivo),
      contentType: "image/jpeg",
    });
  });
  const page = await context.newPage();
  await page.goto(`${origem}/painel-artesao/perfil`);
  const campo = page.getByLabel(/^Foto do perfil/);
  await campo.waitFor();
  const resultados: {
    caso: string;
    bytes: number;
    cliente: string;
    servidor: number;
  }[] = [];
  for (const caso of [
    {
      nome: "pdf-renomeado",
      bytes: Buffer.from("%PDF-1.7"),
      mime: "image/jpeg",
      arquivo: "foto.jpg",
      status: 400,
    },
    {
      nome: "png-3mb",
      bytes: Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        Buffer.alloc(3 * 1024 * 1024 - 8),
      ]),
      mime: "image/png",
      arquivo: "foto.png",
      status: 413,
    },
    {
      nome: "gif",
      bytes: Buffer.from("GIF89a"),
      mime: "image/gif",
      arquivo: "foto.gif",
      status: 400,
    },
  ]) {
    await campo.setInputFiles({
      name: caso.arquivo,
      mimeType: caso.mime,
      buffer: caso.bytes,
    });
    const alerta = page.locator("#perfil-foto-erro");
    await alerta.waitFor({ state: "visible" });
    await page.screenshot({
      path: join(pasta, `${caso.nome}.png`),
      fullPage: true,
    });
    const resposta = await context.request.post(
      `${origem}/api/artesao/perfil/foto`,
      {
        multipart: {
          foto: { name: caso.arquivo, mimeType: caso.mime, buffer: caso.bytes },
        },
      },
    );
    if (resposta.status() !== caso.status)
      throw new Error(`Rejeicao divergente ${caso.nome}`);
    resultados.push({
      caso: caso.nome,
      bytes: caso.bytes.length,
      cliente: await alerta.innerText(),
      servidor: resposta.status(),
    });
  }
  await campo.setInputFiles({
    name: "foto.jpg",
    mimeType: "image/jpeg",
    buffer: jpg,
  });
  await page.locator('img[src^="blob:"]').waitFor();
  await page.screenshot({
    path: join(pasta, "jpg-500kb-previa.png"),
    fullPage: true,
  });
  const enviada = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/artesao/perfil/foto" &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Salvar perfil", exact: true })
    .click();
  const resposta = await enviada;
  if (resposta.status() !== 200) throw new Error("Upload valido falhou");
  await page.getByText("Perfil salvo com sucesso.", { exact: true }).waitFor();
  await page.screenshot({
    path: join(pasta, "jpg-500kb-aceito.png"),
    fullPage: true,
  });
  const perfil = await banco.prisma.perfilArtesao.findUniqueOrThrow({
    where: { usuarioId: artesao.id },
  });
  if (!perfil.foto?.endsWith(".jpg")) throw new Error("Foto nao persistida");
  resultados.push({
    caso: "jpg-500kb",
    bytes: jpg.length,
    cliente: "Perfil salvo com sucesso.",
    servidor: 200,
  });
  await writeFile(
    join(pasta, "resultado.json"),
    JSON.stringify(
      {
        armazenamento: "disco temporario via interface",
        banco: "PostgreSQL real, schema isolado",
        producaoBlobValidada: false,
        resultados,
        fotoPersistida: true,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
}

try {
  await executar();
  console.log(`Capturas Web.6: ${pasta}`);
} catch {
  console.error(
    "Falha nas evidencias Web.6. Nenhuma credencial foi registrada.",
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
  await new Promise<void>((resolve) => {
    if (servidor) servidor.close(() => resolve());
    else resolve();
  });
  await banco?.fechar();
  if (temporario && basename(temporario).startsWith("origem-web6-evidencia-"))
    await rm(temporario, { recursive: true, force: true });
  if (schema) {
    const pool = new Pool({ connectionString: process.env.DIRECT_URL, max: 1 });
    try {
      const restante = await pool.query(
        "SELECT 1 FROM pg_namespace WHERE nspname = $1",
        [schema],
      );
      if (restante.rowCount !== 0) {
        console.error("Schema de evidencia permaneceu no banco.");
        process.exitCode = 1;
      } else {
        await writeFile(
          join(pasta, "limpeza.json"),
          JSON.stringify({
            schemaRemovido: true,
            diretorioTemporarioRemovido: true,
          }) + "\n",
          { flag: "wx" },
        );
      }
    } finally {
      await pool.end();
    }
  }
}

import "dotenv/config";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createApp } from "../../src/app.js";
import { DEMO } from "../../prisma/seeds/demo.js";
import { runSeed } from "../../prisma/seed.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

const python = process.env.WEB5_PYTHON;
const demo = DEMO.usuarios.find((usuario) => usuario.id === "seed-artesao-01");
if (!python || !process.env.DIRECT_URL || !demo)
  throw new Error("Configure WEB5_PYTHON e o banco local para medir Web.5.");
const banco = await criarBancoAuth();
const prisma = banco.prisma;
const server = createApp(prisma, {
  JWT_SECRET: randomUUID(),
  COOKIE_SECURE: false,
}).listen(3305, "127.0.0.1");
try {
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  await prisma.$transaction((tx) => runSeed(tx), { timeout: 120_000 });
  const usuario = await prisma.usuario.findUnique({
    where: { email: demo.email },
    select: { papel: true, ativo: true },
  });
  if (!usuario?.ativo || usuario.papel !== "artesao")
    throw new Error("Artesao demo ativo nao encontrado no schema isolado.");
  const codigo = await new Promise<number | null>((resolve, reject) => {
    const child = spawn(
      python,
      [fileURLToPath(new URL("web5-performance.py", import.meta.url))],
      {
        stdio: "inherit",
        windowsHide: true,
        env: {
          ...process.env,
          WEB5_DEMO_EMAIL: demo.email,
          WEB5_DEMO_PASSWORD: demo.senha,
        },
      },
    );
    child.once("error", reject);
    child.once("exit", resolve);
  });
  if (codigo !== 0) process.exitCode = codigo ?? 1;
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await banco.fechar();
  process.stdout.write("Schema isolado Web.5 removido.\n");
}

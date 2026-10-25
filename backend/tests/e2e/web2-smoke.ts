import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";
import { config } from "dotenv";
import { createApp } from "../../src/app.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

const python = process.env.WEB2_PYTHON;
config({
  path: fileURLToPath(new URL("../../.env", import.meta.url)),
  quiet: true,
});
if (!python)
  throw new Error("Defina WEB2_PYTHON para executar o smoke visual.");
const senha = randomUUID();
const banco = await criarBancoAuth();
const app = createApp(banco.prisma, {
  JWT_SECRET: randomUUID(),
  COOKIE_SECURE: false,
});
const server = app.listen(3302, "127.0.0.1");
try {
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const senhaHash = await bcrypt.hash(senha, 4);
  const comprador = await banco.prisma.usuario.create({
    data: {
      nome: "Comprador sintetico Web.2",
      email: "web2-comprador@teste.origem",
      senhaHash,
      papel: "comprador",
      carrinho: { create: {} },
    },
  });
  const artesao = await banco.prisma.usuario.create({
    data: {
      nome: "Artesao sintetico Web.2",
      email: "web2-artesao@teste.origem",
      senhaHash,
      papel: "artesao",
      perfilArtesao: { create: {} },
    },
  });
  const outro = await banco.prisma.usuario.create({
    data: {
      nome: "Outro artesao sintetico",
      email: "web2-outro@teste.origem",
      senhaHash,
      papel: "artesao",
      perfilArtesao: { create: {} },
    },
  });
  const categoria = await banco.prisma.categoria.create({
    data: { nome: "Web.2 visual" },
  });
  const itens = [];
  for (let indice = 1; indice <= 6; indice += 1) {
    const produto = await banco.prisma.produto.create({
      data: {
        nome:
          indice === 1
            ? `Vaso artesanal ${"nomeextensoparaverificarquebra".repeat(4)}`
            : `Peca sintetica ${indice}`,
        descricao: "Sintetica Web.2",
        preco: 10,
        quantidadeEstoque: 10,
        artesaoId: indice === 6 ? outro.id : artesao.id,
        categoriaId: categoria.id,
        tecnicaId: "tecnica-modelagem-argila",
      },
    });
    itens.push({
      produtoId: produto.id,
      quantidade: 1,
      precoUnitario: 10,
      subtotal: 10,
    });
  }
  await banco.prisma.pedido.create({
    data: {
      compradorId: comprador.id,
      status: "confirmado",
      total: 60,
      itens: { create: itens },
      pagamento: { create: { valor: 60, status: "aprovado" } },
    },
  });
  const script = fileURLToPath(new URL("web2-smoke.py", import.meta.url));
  const codigo = await new Promise<number | null>((resolve, reject) => {
    const child = spawn(python, [script], {
      stdio: "inherit",
      windowsHide: true,
      env: { ...process.env, WEB2_SMOKE_PASSWORD: senha },
    });
    child.once("error", reject);
    child.once("exit", resolve);
  });
  if (codigo !== 0) process.exitCode = codigo ?? 1;
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await banco.fechar();
  process.stdout.write("Schema isolado do smoke removido.\n");
}

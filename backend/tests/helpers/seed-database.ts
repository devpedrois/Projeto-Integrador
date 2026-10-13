import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.js";

export async function criarBancoSeed() {
  const schema = `bd05_${randomUUID().replaceAll("-", "")}`;
  const pool = new Pool({ connectionString: process.env.DIRECT_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET LOCAL search_path TO "${schema}"`);
    const root = new URL("../../prisma/migrations/", import.meta.url);
    for (const migration of readdirSync(root)
      .filter((name) => /^\d/.test(name))
      .sort()) {
      const sql = readFileSync(
        new URL(`${migration}/migration.sql`, root),
        "utf8",
      )
        .replace(/^BEGIN;\s*/, "")
        .replace(/COMMIT;\s*$/, "");
      await client.query(sql);
    }
  } catch {
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
    throw new Error("Falha ao preparar schema isolado BD-05");
  }
  client.release();
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
  return {
    prisma,
    async fechar() {
      await prisma.$disconnect();
      await pool.query("ROLLBACK");
      await pool.end();
    },
  };
}

export async function contagensSeed(prisma: PrismaClient) {
  return {
    usuarios: await prisma.usuario.count(),
    artesaos: await prisma.usuario.count({ where: { papel: "artesao" } }),
    compradores: await prisma.usuario.count({ where: { papel: "comprador" } }),
    perfis: await prisma.perfilArtesao.count(),
    carrinhos: await prisma.carrinho.count(),
    categorias: await prisma.categoria.count(),
    tecnicas: await prisma.tecnica.count(),
    regioes: await prisma.regiao.count(),
    produtos: await prisma.produto.count(),
    fotos: await prisma.produtoFoto.count(),
    pedidos: await prisma.pedido.count(),
    itens: await prisma.itemPedido.count(),
    pagamentos: await prisma.pagamento.count(),
    avaliacoes: await prisma.avaliacao.count(),
  };
}

import "dotenv/config";
import { pathToFileURL } from "node:url";
import type { Prisma } from "../src/generated/prisma/client.js";
import { parseEnvironment } from "../src/config/environment.js";
import { createPrismaClient } from "../src/database/prisma/client.js";
import { gerarHash } from "../src/utils/senha.js";
import { TECNICAS_SEED, REGIOES_SEED } from "./seeds/referencias.js";
import { DEMO } from "./seeds/demo.js";
import { seedUuid } from "./seeds/id.js";

export async function runSeed(tx: Prisma.TransactionClient): Promise<void> {
  for (const tecnica of TECNICAS_SEED) {
    await tx.tecnica.upsert({
      where: { id: tecnica.id },
      update: { nome: tecnica.nome },
      create: tecnica,
    });
  }
  for (const regiao of REGIOES_SEED) {
    await tx.regiao.upsert({
      where: { id: regiao.id },
      update: { nome: regiao.nome },
      create: regiao,
    });
  }
  for (const usuario of DEMO.usuarios) {
    const data = {
      id: seedUuid(usuario.id),
      nome: usuario.nome,
      email: usuario.email.toLowerCase(),
      senhaHash: await gerarHash(usuario.senha),
      papel: usuario.papel,
      ativo: usuario.ativo,
      criadoEm: new Date("2026-08-01T00:00:00.000Z"),
    };
    await tx.usuario.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
    if (usuario.papel === "comprador") {
      await tx.carrinho.upsert({
        where: { usuarioId: data.id },
        update: {},
        create: { usuarioId: data.id },
      });
    }
  }
  for (const perfil of DEMO.perfis_artesao) {
    const data = {
      usuarioId: seedUuid(perfil.artesaoId),
      historia: perfil.historia,
      tecnicaPrincipalId: perfil.tecnicaId,
      regiaoId: perfil.regiaoId || null,
      foto: "fotoUrl" in perfil ? perfil.fotoUrl : null,
      completo: Boolean(perfil.historia && perfil.tecnicaId && perfil.regiaoId),
    };
    await tx.perfilArtesao.upsert({
      where: { usuarioId: data.usuarioId },
      update: data,
      create: data,
    });
  }
  for (const categoria of DEMO.categorias) {
    const data = { id: seedUuid(categoria.id), nome: categoria.nome };
    await tx.categoria.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
  }
  for (const produto of DEMO.produtos) {
    const data = {
      id: seedUuid(produto.id),
      nome: produto.nome,
      descricao: produto.descricao,
      artesaoId: seedUuid(produto.artesaoId),
      categoriaId: seedUuid(produto.categoriaId),
      tecnicaId: produto.tecnicaId,
      preco: produto.preco.toFixed(2),
      quantidadeEstoque: produto.quantidadeEstoque,
      ativo: produto.ativo,
      desativadoPorAdmin: false,
      criadoEm: new Date(produto.criadoEm),
    };
    await tx.produto.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
    for (const foto of produto.fotos) {
      const dataFoto = {
        id: seedUuid(`foto:${produto.id}:${foto.ordem}`),
        produtoId: data.id,
        url: foto.url,
        ordem: foto.ordem,
      };
      await tx.produtoFoto.upsert({
        where: { produtoId_ordem: { produtoId: data.id, ordem: foto.ordem } },
        update: { url: foto.url },
        create: dataFoto,
      });
    }
  }
  for (const avaliacao of DEMO.avaliacoes) {
    const data = {
      id: seedUuid(avaliacao.id),
      produtoId: seedUuid(avaliacao.produtoId),
      compradorId: seedUuid(avaliacao.compradorId),
      nota: avaliacao.nota,
      comentario: "comentario" in avaliacao ? avaliacao.comentario : null,
      criadoEm: new Date(avaliacao.criadoEm),
    };
    await tx.avaliacao.upsert({
      where: {
        compradorId_produtoId: {
          compradorId: data.compradorId,
          produtoId: data.produtoId,
        },
      },
      update: data,
      create: data,
    });
  }
  for (let indice = 0; indice < 3; indice += 1) {
    const produto = DEMO.produtos[indice];
    const comprador = DEMO.usuarios[indice % 2];
    if (produto === undefined || comprador === undefined)
      throw new Error("Carga demo incompleta");
    const pedidoId = seedUuid(`demo-pedido-${indice}`);
    const compradorId = seedUuid(comprador.id);
    const valor = produto.preco.toFixed(2);
    const criadoEm = new Date(`2026-09-0${indice + 1}T12:00:00.000Z`);
    const pedido = {
      id: pedidoId,
      numero: `DEMO-${String(indice + 1).padStart(4, "0")}`,
      compradorId,
      status: "confirmado" as const,
      total: valor,
      criadoEm,
    };
    await tx.pedido.upsert({
      where: { id: pedidoId },
      update: pedido,
      create: pedido,
    });
    const item = {
      id: seedUuid(`demo-item-${indice}`),
      pedidoId,
      produtoId: seedUuid(produto.id),
      quantidade: 1,
      precoUnitario: valor,
      subtotal: valor,
    };
    await tx.itemPedido.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
    const pagamento = {
      id: seedUuid(`demo-pagamento-${indice}`),
      pedidoId,
      valor,
      metodo: "pix_simulado" as const,
      status: "aprovado" as const,
      dataPagamento: criadoEm,
    };
    await tx.pagamento.upsert({
      where: { pedidoId },
      update: pagamento,
      create: pagamento,
    });
  }
}

async function main(): Promise<void> {
  const environment = parseEnvironment(process.env);
  const prisma = createPrismaClient(environment.DATABASE_URL);
  try {
    await prisma.$transaction((tx) => runSeed(tx), { timeout: 120000 });
    console.log("Seed demo concluido");
  } finally {
    await prisma.$disconnect();
  }
}

const executedFile = process.argv[1];
if (
  executedFile !== undefined &&
  import.meta.url === pathToFileURL(executedFile).href
) {
  main().catch(() => {
    process.stderr.write("Database seed failed\n");
    process.exitCode = 1;
  });
}

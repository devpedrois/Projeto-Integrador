import "dotenv/config";
import { pathToFileURL } from "node:url";
import type { Prisma } from "../src/generated/prisma/client.js";
import { createPrismaClient } from "../src/database/prisma/client.js";
import { gerarHash } from "../src/utils/senha.js";
import { DEMO } from "./seeds/demo.js";
import { seedUuid } from "./seeds/id.js";
import { gerarVolume, validarVolumeEnvironment } from "./seeds/volume.js";
import { TECNICAS_SEED, REGIOES_SEED } from "./seeds/referencias.js";

export async function runVolumeSeed(
  tx: Prisma.TransactionClient,
): Promise<void> {
  const dados = gerarVolume();
  const senhaHash = await gerarHash(DEMO.usuarios[0].senha);
  await tx.tecnica.createMany({
    data: [...TECNICAS_SEED],
    skipDuplicates: true,
  });
  await tx.regiao.createMany({ data: [...REGIOES_SEED], skipDuplicates: true });
  await tx.categoria.createMany({
    data: DEMO.categorias.map((categoria) => ({
      id: seedUuid(categoria.id),
      nome: categoria.nome,
    })),
    skipDuplicates: true,
  });
  await tx.usuario.createMany({
    data: [
      ...dados.artesaos.map(({ id, nome, email }) => ({
        id,
        nome,
        email,
        senhaHash,
        papel: "artesao" as const,
        criadoEm: dados.criadoEm,
      })),
      ...dados.compradores.map(({ id, nome, email }) => ({
        id,
        nome,
        email,
        senhaHash,
        papel: "comprador" as const,
        criadoEm: dados.criadoEm,
      })),
    ],
    skipDuplicates: true,
  });
  await tx.perfilArtesao.createMany({
    data: dados.artesaos.map(({ id, tecnicaPrincipalId, regiaoId }) => ({
      usuarioId: id,
      tecnicaPrincipalId,
      regiaoId,
      historia: "Perfil sintetico de teste",
      completo: true,
    })),
    skipDuplicates: true,
  });
  await tx.carrinho.createMany({
    data: dados.compradores.map(({ id }) => ({
      usuarioId: id,
      atualizadoEm: dados.criadoEm,
    })),
    skipDuplicates: true,
  });
  await tx.produto.createMany({
    data: dados.produtos.map(({ precoCentavos, ...produto }) => ({
      ...produto,
      preco: (precoCentavos / 100).toFixed(2),
    })),
    skipDuplicates: true,
  });
  await tx.pedido.createMany({
    data: dados.pedidos.map(
      ({ id, numero, compradorId, totalCentavos, criadoEm }) => ({
        id,
        numero,
        compradorId,
        total: (totalCentavos / 100).toFixed(2),
        status: "confirmado" as const,
        criadoEm,
      }),
    ),
    skipDuplicates: true,
  });
  await tx.itemPedido.createMany({
    data: dados.pedidos.map(
      ({ id, produtoId, quantidade, precoCentavos, totalCentavos }) => ({
        id: seedUuid(`item:${id}`),
        pedidoId: id,
        produtoId,
        quantidade,
        precoUnitario: (precoCentavos / 100).toFixed(2),
        subtotal: (totalCentavos / 100).toFixed(2),
      }),
    ),
    skipDuplicates: true,
  });
  await tx.pagamento.createMany({
    data: dados.pedidos.map(({ id, totalCentavos, criadoEm }) => ({
      id: seedUuid(`pagamento:${id}`),
      pedidoId: id,
      valor: (totalCentavos / 100).toFixed(2),
      status: "aprovado" as const,
      metodo: "pix_simulado" as const,
      dataPagamento: criadoEm,
    })),
    skipDuplicates: true,
  });
}

async function main(): Promise<void> {
  const databaseUrl = validarVolumeEnvironment(process.env);
  const prisma = createPrismaClient(databaseUrl);
  try {
    await prisma.$transaction((tx) => runVolumeSeed(tx), { timeout: 120000 });
    console.log(
      "Seed volume concluido: 1000 produtos, 50 artesaos, 300 compradores, 1500 pedidos",
    );
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
    process.stderr.write("Database volume seed refused or failed\n");
    process.exitCode = 1;
  });
}

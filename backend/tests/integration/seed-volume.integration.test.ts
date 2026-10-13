import { expect, it } from "vitest";
import { runVolumeSeed } from "../../prisma/seed-volume.js";
import { criarBancoSeed, contagensSeed } from "../helpers/seed-database.js";

it("BD-05 repete volume em dois schemas limpos da branch de teste", async () => {
  const snapshots = [];
  for (let execucao = 0; execucao < 2; execucao += 1) {
    const banco = await criarBancoSeed();
    try {
      await runVolumeSeed(banco.prisma);
      const contagens = await contagensSeed(banco.prisma);
      expect(contagens).toEqual({
        usuarios: 350,
        artesaos: 50,
        compradores: 300,
        perfis: 50,
        carrinhos: 300,
        categorias: 6,
        tecnicas: 10,
        regioes: 3,
        produtos: 1000,
        fotos: 0,
        pedidos: 1500,
        itens: 1500,
        pagamentos: 1500,
        avaliacoes: 0,
      });
      snapshots.push({
        contagens,
        produtos: await banco.prisma.produto.findMany({
          orderBy: { id: "asc" },
        }),
        pedidos: await banco.prisma.pedido.findMany({
          orderBy: { id: "asc" },
          include: { itens: true, pagamento: true },
        }),
      });
      await runVolumeSeed(banco.prisma);
      expect(await contagensSeed(banco.prisma)).toEqual(contagens);
    } finally {
      await banco.fechar();
    }
  }
  expect(snapshots[1]).toEqual(snapshots[0]);
}, 180000);

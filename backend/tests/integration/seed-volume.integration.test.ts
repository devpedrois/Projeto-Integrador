import { expect, it } from "vitest";
import { runVolumeSeed } from "../../prisma/seed-volume.js";
import { criarBancoSeed, contagensSeed } from "../helpers/seed-database.js";

it("BD.1 repete volume multiartesao em dois schemas limpos sem duplicar", async () => {
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
        itens: 1550,
        pagamentos: 1500,
        avaliacoes: 0,
      });
      const [multiArtesao] = await banco.prisma.$queryRaw<{ total: number }[]>`
        SELECT count(*)::int AS total
        FROM (
          SELECT pedido.id
          FROM "Pedido" pedido
          JOIN "ItemPedido" item ON item."pedidoId" = pedido.id
          JOIN "Produto" produto ON produto.id = item."produtoId"
          JOIN "Pagamento" pagamento ON pagamento."pedidoId" = pedido.id
          WHERE pedido.status = 'confirmado'
            AND pagamento.status = 'aprovado'
          GROUP BY pedido.id
          HAVING count(DISTINCT produto."artesaoId") >= 2
        ) pedidos
      `;
      expect(multiArtesao?.total).toBeGreaterThanOrEqual(50);
      const cobertura = await banco.prisma.$queryRaw<
        { dimensao: string; id: string; produtos: number }[]
      >`
        SELECT 'categoria' AS dimensao, categoria.id::text AS id,
          count(produto.id)::int AS produtos
        FROM "Categoria" categoria
        LEFT JOIN "Produto" produto ON produto."categoriaId" = categoria.id
        GROUP BY categoria.id
        UNION ALL
        SELECT 'tecnica', tecnica.id, count(produto.id)::int
        FROM "Tecnica" tecnica
        LEFT JOIN "Produto" produto ON produto."tecnicaId" = tecnica.id
        GROUP BY tecnica.id
        UNION ALL
        SELECT 'regiao', regiao.id, count(produto.id)::int
        FROM "Regiao" regiao
        LEFT JOIN "PerfilArtesao" perfil ON perfil."regiaoId" = regiao.id
        LEFT JOIN "Produto" produto ON produto."artesaoId" = perfil."usuarioId"
        GROUP BY regiao.id
        ORDER BY dimensao, id
      `;
      expect(cobertura).toHaveLength(19);
      expect(cobertura.every((grupo) => grupo.produtos > 0)).toBe(true);
      const pedidos = await banco.prisma.pedido.findMany({
        orderBy: { id: "asc" },
        include: { itens: { orderBy: { id: "asc" } }, pagamento: true },
      });
      for (const pedido of pedidos) {
        const soma = pedido.itens.reduce(
          (total, item) => total + Math.round(Number(item.subtotal) * 100),
          0,
        );
        expect(Math.round(Number(pedido.total) * 100)).toBe(soma);
        expect(Math.round(Number(pedido.pagamento?.valor) * 100)).toBe(soma);
      }
      snapshots.push({
        contagens,
        cobertura,
        usuarios: await banco.prisma.usuario.findMany({
          select: { id: true },
          orderBy: { id: "asc" },
        }),
        perfis: await banco.prisma.perfilArtesao.findMany({
          orderBy: { usuarioId: "asc" },
        }),
        carrinhos: await banco.prisma.carrinho.findMany({
          orderBy: { usuarioId: "asc" },
        }),
        produtos: await banco.prisma.produto.findMany({
          orderBy: { id: "asc" },
        }),
        pedidos,
      });
      await runVolumeSeed(banco.prisma);
      expect(await contagensSeed(banco.prisma)).toEqual(contagens);
      expect(
        await banco.prisma.pedido.findMany({
          orderBy: { id: "asc" },
          include: { itens: { orderBy: { id: "asc" } }, pagamento: true },
        }),
      ).toEqual(pedidos);
    } finally {
      await banco.fechar();
    }
  }
  expect(snapshots[1]).toEqual(snapshots[0]);
}, 180000);

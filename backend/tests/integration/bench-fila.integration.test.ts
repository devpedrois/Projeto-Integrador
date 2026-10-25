import "dotenv/config";
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { runVolumeSeed } from "../../prisma/seed-volume.js";
import { gerarVolume } from "../../prisma/seeds/volume.js";
import { executarRodada } from "../../scripts/bench-fila.js";
import { prepararIntencoes } from "../../scripts/lib/bench-fila.js";
import {
  createPgBossClient,
  ensureNotificarArtesaoQueue,
} from "../../src/queues/pg-boss.client.js";
import { criarBancoAuth } from "../helpers/auth-database.js";
import { databasePool } from "../helpers/database.js";

it("30.5 mede processos reais e reinicia somente as intencoes selecionadas", async () => {
  const banco = await criarBancoAuth();
  const schemas = await banco.prisma.$queryRaw<
    { schema: string }[]
  >`SELECT current_schema() AS schema`;
  const schema = schemas[0]?.schema;
  if (!schema) throw new Error("Schema de teste ausente");
  const queueSchema = `bench_fila_${randomUUID().replaceAll("-", "")}`;
  const databaseUrl = process.env.DIRECT_URL;
  if (!databaseUrl) throw new Error("DIRECT_URL ausente");
  const boss = createPgBossClient(databaseUrl, { schema: queueSchema });
  boss.on("error", () => {});
  try {
    await runVolumeSeed(banco.prisma);
    await boss.start();
    await ensureNotificarArtesaoQueue(boss);
    const dados = gerarVolume();
    const pedidos = dados.pedidos.slice(0, 4).map((p) => p.id);
    const fora = dados.pedidos[4]?.id;
    const artesao = dados.artesaos[0]?.id;
    if (!fora || !artesao) throw new Error("Fixture incompleta");
    const foraIntencao = await banco.prisma.intencaoNotificacao.create({
      data: {
        pedidoId: fora,
        status: "processada",
        tentativas: 7,
        processadaEm: new Date(),
      },
    });
    const foraNotificacao = await banco.prisma.notificacao.create({
      data: { pedidoId: fora, usuarioId: artesao, tipo: "novo_pedido" },
    });
    for (const workers of [1, 2]) {
      const rodada = await executarRodada({
        prisma: banco.prisma,
        boss,
        pool: databasePool,
        schema: queueSchema,
        dataSchema: schema,
        databaseUrl,
        pedidoIds: pedidos,
        workers,
        latenciaMs: 200,
        rodada: workers,
        aquecimento: false,
        progresso: () => {},
      });
      expect(rodada).toMatchObject({
        valida: true,
        workers,
        itens: 4,
        processadas: 4,
        duplicadas: 0,
        tentativasMin: 1,
        tentativasMax: 1,
        tentativasTotal: 4,
        notificacoes: 8,
        notificacoesEsperadas: 8,
      });
      expect(new Set(rodada.pids).size).toBe(workers);
      expect(rodada.pids).not.toContain(process.pid);
      expect(rodada.duracaoMs).toBeGreaterThanOrEqual(200);
      expect(rodada.diagnostico.jobsConcluidos).toBe(4);
      expect(rodada.diagnostico.medianaExecucaoMs).toBeGreaterThanOrEqual(200);
      expect(rodada.intencoes).toHaveLength(4);
      expect(
        await banco.prisma.intencaoNotificacao.findUnique({
          where: { id: foraIntencao.id },
        }),
      ).toEqual(foraIntencao);
      expect(
        await banco.prisma.notificacao.findUnique({
          where: { id: foraNotificacao.id },
        }),
      ).toEqual(foraNotificacao);
    }
    await expect(
      prepararIntencoes(banco.prisma, [randomUUID()]),
    ).rejects.toThrow("pedidos confirmados completos");
    expect(
      await banco.prisma.notificacao.count({
        where: { pedidoId: { in: pedidos } },
      }),
    ).toBe(8);
  } finally {
    await boss.stop({ graceful: true });
    await databasePool.query(`DROP SCHEMA IF EXISTS "${queueSchema}" CASCADE`);
    await banco.fechar();
  }
}, 120_000);

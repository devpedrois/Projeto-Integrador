import "dotenv/config";
import { spawn } from "node:child_process";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { startServer } from "../../src/server.js";
import { gerarHash } from "../../src/utils/senha.js";
import { databasePool } from "../helpers/database.js";
import { criarBancoAuth } from "../helpers/auth-database.js";
import { createPgBossClient } from "../../src/queues/pg-boss.client.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error("DATABASE_URL is required for integration tests");

async function waitFor(check: () => Promise<boolean>) {
  const deadline = Date.now() + 15_000;
  while (!(await check())) {
    if (Date.now() > deadline)
      throw new Error("Notification processing timed out");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function startWorkerProcess(schema: string, queueSchema: string) {
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "--eval",
      `
    import { startWorker } from "./src/worker.ts";
    import { PrismaPg } from "@prisma/adapter-pg";
    import { PrismaClient } from "./src/generated/prisma/client.ts";
    import { createPgBossClient } from "./src/queues/pg-boss.client.ts";
    const prisma = new PrismaClient({adapter: new PrismaPg({connectionString: process.env.DIRECT_URL}, {schema: process.env.WORKER_TEST_SCHEMA})});
    const boss = createPgBossClient(process.env.DATABASE_URL, {schema: process.env.WORKER_TEST_QUEUE_SCHEMA});
    await startWorker(process.env, {prisma, boss});
    process.on("message", (signal) => process.emit(signal));
    process.channel.unref();
    process.send({ ready: true, pid: process.pid });
  `,
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: "test",
        NODE_NO_WARNINGS: "1",
        WORKER_TEST_SCHEMA: schema,
        WORKER_TEST_QUEUE_SCHEMA: queueSchema,
      },
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    },
  );
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    stdout += chunk.toString();
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  const closed = new Promise<number | null>((resolve) =>
    child.once("close", resolve),
  );
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Worker startup timed out")),
        15_000,
      );
      child.once("error", reject);
      child.once("close", () => {
        clearTimeout(timeout);
        reject(new Error("Worker startup failed"));
      });
      child.once("message", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  } catch (error) {
    child.kill();
    await closed;
    throw error;
  }
  let shutdownRequested = false;
  function signal(signal: "SIGINT" | "SIGTERM") {
    shutdownRequested = true;
    if (process.platform === "win32") child.send(signal);
    else child.kill(signal);
  }
  return {
    pid: child.pid,
    signal,
    isRunning: () => child.exitCode === null,
    async stop(signal: "SIGINT" | "SIGTERM") {
      const timeout = setTimeout(() => child.kill(), 15_000);
      try {
        if (!shutdownRequested) {
          shutdownRequested = true;
          if (process.platform === "win32") child.send(signal);
          else child.kill(signal);
        }
        const code = await closed;
        expect({ code, stdout, stderr }).toEqual({
          code: 0,
          stdout: "",
          stderr: "",
        });
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

describe("API and independent worker processes", () => {
  it.each([1, 2])(
    "keeps orders unprocessed until %i worker processes start, with one notification per order",
    async (workerCount) => {
      const totalPedidos = workerCount === 1 ? 1 : 6;
      const database = await criarBancoAuth();
      const prisma = database.prisma;
      const rows = await prisma.$queryRaw<
        { schema: string }[]
      >`SELECT current_schema() AS schema`;
      const schema = rows[0]?.schema;
      if (schema === undefined || !/^web03_[a-f0-9]{32}$/.test(schema)) {
        throw new Error("Expected an isolated worker test schema");
      }
      const queueSchema = `${schema}_queue`;
      const boss = createPgBossClient(databaseUrl, {
        schema: queueSchema,
      });
      const { server } = await startServer(
        {
          ...process.env,
          NODE_ENV: "test",
          PORT: "3114",
          RUN_WORKER_IN_API: "false",
          JWT_SECRET: "synthetic-worker-process-secret-30-3",
          COOKIE_SECURE: "false",
          NOTIFICATION_PUBLISHER_INTERVAL_MS: "1000",
        },
        { prisma, boss },
      );
      const workers: Awaited<ReturnType<typeof startWorkerProcess>>[] = [];
      const pedidoIds: string[] = [];
      let releaseLock: (() => Promise<void>) | undefined;
      try {
        const artesao = await prisma.usuario.create({
          data: {
            nome: "Artesao sintetico",
            email: "artesao@worker.test",
            senhaHash: "hash-sintetico",
            papel: "artesao",
          },
        });
        const artesaoId = artesao.id;
        const senha = "SenhaSinteticaWorker30.3!";
        const usuario = await prisma.usuario.create({
          data: {
            nome: "Comprador sintetico",
            email: "comprador@worker.test",
            senhaHash: await gerarHash(senha),
            papel: "comprador",
          },
        });
        const categoria = await prisma.categoria.create({
          data: { nome: "Categoria sintetica" },
        });
        const produto = await prisma.produto.create({
          data: {
            nome: "Produto sintetico",
            descricao: "Teste 30.3",
            preco: "10.00",
            artesaoId,
            categoriaId: categoria.id,
            tecnicaId: "tecnica-modelagem-argila",
            quantidadeEstoque: 6,
          },
        });
        const produtoId = produto.id;
        const comprador = request.agent(server);
        expect(
          (
            await comprador
              .post("/auth/login")
              .send({ email: usuario.email, senha })
          ).status,
        ).toBe(200);
        for (let index = 0; index < totalPedidos; index += 1) {
          const response = await comprador
            .post("/pedidos")
            .send({ itens: [{ produtoId, quantidade: 1 }] });
          expect(response.status).toBe(201);
          pedidoIds.push(response.body.pedido.id as string);
        }
        await waitFor(
          async () =>
            (await prisma.intencaoNotificacao.count({
              where: { pedidoId: { in: pedidoIds }, status: "publicada" },
            })) === totalPedidos,
        );
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const pending = await prisma.intencaoNotificacao.findMany({
          where: { pedidoId: { in: pedidoIds } },
        });
        expect(pending).toHaveLength(totalPedidos);
        expect(
          pending.every(
            (item) =>
              item.status === "publicada" &&
              item.tentativas === 0 &&
              item.processadaEm === null,
          ),
        ).toBe(true);
        expect(
          await prisma.notificacao.count({
            where: { pedidoId: { in: pedidoIds } },
          }),
        ).toBe(0);

        if (process.env.WORKER_EVIDENCE === "1") {
          console.info(
            JSON.stringify({
              etapa: "API",
              pid: process.pid,
              consumidores: workerCount,
              intencoes: pending.map(
                ({ id, pedidoId, status, tentativas }) => ({
                  id,
                  pedidoId,
                  status,
                  tentativas,
                }),
              ),
            }),
          );
        }

        if (workerCount === 1) {
          const lock = await databasePool.connect();
          releaseLock = async () => {
            await lock.query("ROLLBACK");
            lock.release();
          };
          await lock.query("BEGIN");
          await lock.query(
            `SELECT "id" FROM "${schema}"."Pedido" WHERE "id" = $1 FOR UPDATE`,
            [pedidoIds[0]],
          );
        }

        for (let index = 0; index < workerCount; index += 1)
          workers.push(await startWorkerProcess(schema, queueSchema));
        expect(new Set(workers.map((worker) => worker.pid)).size).toBe(
          workerCount,
        );
        const workerPids = workers.map((worker) => worker.pid);
        if (workerCount === 1) {
          await waitFor(
            async () =>
              (await prisma.intencaoNotificacao.count({
                where: { pedidoId: { in: pedidoIds }, tentativas: 1 },
              })) === 1,
          );
          const worker = workers[0];
          if (worker === undefined)
            throw new Error("Expected an active worker");
          const shutdown = worker.stop("SIGINT");
          worker.signal("SIGTERM");
          await new Promise((resolve) => setTimeout(resolve, 200));
          expect(worker.isRunning()).toBe(true);
          expect(
            await prisma.notificacao.count({
              where: { pedidoId: { in: pedidoIds } },
            }),
          ).toBe(0);
          await releaseLock?.();
          releaseLock = undefined;
          await shutdown;
        }
        await waitFor(
          async () =>
            (await prisma.intencaoNotificacao.count({
              where: { pedidoId: { in: pedidoIds }, status: "processada" },
            })) === totalPedidos,
        );
        for (const [index, worker] of workers.splice(0).entries())
          await worker.stop(index === 0 ? "SIGINT" : "SIGTERM");
        const processed = await prisma.intencaoNotificacao.findMany({
          where: { pedidoId: { in: pedidoIds } },
        });
        expect(
          processed.every(
            (item) => item.tentativas === 1 && item.processadaEm !== null,
          ),
        ).toBe(true);
        const notifications = await prisma.notificacao.findMany({
          where: { pedidoId: { in: pedidoIds } },
        });
        expect(notifications).toHaveLength(totalPedidos);
        expect(
          new Set(
            notifications.map(
              (item) => `${item.usuarioId}:${item.pedidoId}:${item.tipo}`,
            ),
          ).size,
        ).toBe(totalPedidos);
        expect(
          notifications.every(
            (item) =>
              item.usuarioId === artesaoId && item.tipo === "novo_pedido",
          ),
        ).toBe(true);
        if (process.env.WORKER_EVIDENCE === "1") {
          console.info(
            JSON.stringify({
              etapa: "worker",
              consumidores: workerCount,
              pids: workerPids,
              intencoes: processed.map(
                ({ id, pedidoId, status, tentativas }) => ({
                  id,
                  pedidoId,
                  status,
                  tentativas,
                }),
              ),
              notificacoes: notifications.length,
              unicas: new Set(
                notifications.map(
                  (item) => `${item.usuarioId}:${item.pedidoId}:${item.tipo}`,
                ),
              ).size,
            }),
          );
        }
      } finally {
        await releaseLock?.();
        for (const worker of workers) await worker.stop("SIGTERM");
        await new Promise<void>((resolve) => server.close(() => resolve()));
        await boss.stop({ graceful: true });
        try {
          await databasePool.query(
            `DROP SCHEMA IF EXISTS "${queueSchema}" CASCADE`,
          );
        } finally {
          await database.fechar();
        }
      }
    },
    60_000,
  );
});

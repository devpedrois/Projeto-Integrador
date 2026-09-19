import "dotenv/config";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { Pool } from "pg";
import { parseEnvironment } from "../src/config/environment.js";
import { startServer } from "../src/server.js";

const ROUNDS = 3;
const DEFAULT_PORT = "3910";

interface PedidoResponseBody {
  pedido?: { id?: string; status?: string };
}

interface PedidoResponse {
  status: number;
  body: PedidoResponseBody | undefined;
}

interface RoundResult {
  round: number;
  failures: string[];
}

async function createUsuario(pool: Pool, papel: "artesao" | "comprador"): Promise<string> {
  const id = randomUUID();
  await pool.query(
    'INSERT INTO "Usuario" ("id", "nome", "email", "senhaHash", "papel") VALUES ($1, $2, $3, $4, $5)',
    [id, `Usuario concorrencia ${id}`, `concorrencia-${id}@teste.origem`, "hash-de-teste", papel],
  );
  return id;
}

async function createCategoria(pool: Pool): Promise<string> {
  const id = randomUUID();
  await pool.query('INSERT INTO "Categoria" ("id", "nome") VALUES ($1, $2)', [
    id,
    `Categoria concorrencia ${id}`,
  ]);
  return id;
}

async function createProduto(
  pool: Pool,
  quantidadeEstoque: number,
  artesaoId: string,
  categoriaId: string,
): Promise<string> {
  const id = randomUUID();
  await pool.query(
    'INSERT INTO "Produto" ("id", "nome", "artesaoId", "categoriaId", "quantidadeEstoque") VALUES ($1, $2, $3, $4, $5)',
    [id, `Produto concorrencia ${id}`, artesaoId, categoriaId, quantidadeEstoque],
  );
  return id;
}

async function getEstoque(pool: Pool, produtoId: string): Promise<number> {
  const result = await pool.query<{ quantidadeEstoque: number }>(
    'SELECT "quantidadeEstoque" FROM "Produto" WHERE "id" = $1',
    [produtoId],
  );
  const row = result.rows[0];
  if (row === undefined) {
    throw new Error("produto not found while reading final stock");
  }
  return row.quantidadeEstoque;
}

async function countPedidosPersistidos(pool: Pool, produtoId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    'SELECT COUNT(DISTINCT "pedidoId")::text AS count FROM "ItemPedido" WHERE "produtoId" = $1',
    [produtoId],
  );
  return Number(result.rows[0]?.count ?? "0");
}

async function limparRodada(pool: Pool, produtoId: string, pedidoIds: string[]): Promise<void> {
  if (pedidoIds.length > 0) {
    await pool.query('DELETE FROM "IntencaoNotificacao" WHERE "pedidoId" = ANY($1)', [pedidoIds]);
  }
  await pool.query('DELETE FROM "ItemPedido" WHERE "produtoId" = $1', [produtoId]);
  if (pedidoIds.length > 0) {
    await pool.query('DELETE FROM "Pedido" WHERE "id" = ANY($1)', [pedidoIds]);
  }
  await pool.query('DELETE FROM "Produto" WHERE "id" = $1', [produtoId]);
}

async function postPedido(
  baseUrl: string,
  produtoId: string,
  compradorId: string,
): Promise<PedidoResponse> {
  const response = await fetch(`${baseUrl}/pedidos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      compradorRef: `comprador-concorrencia-${randomUUID()}`,
      compradorId,
      itens: [{ produtoId, quantidade: 1 }],
    }),
  });
  const body = (await response.json().catch(() => undefined)) as PedidoResponseBody | undefined;
  return { status: response.status, body };
}

function assertCondition(condition: boolean, message: string, failures: string[]): void {
  if (!condition) {
    failures.push(message);
  }
}

interface FixturesFCCPD {
  artesaoId: string;
  categoriaId: string;
  compradorId: string;
}

async function runRound(
  round: number,
  baseUrl: string,
  pool: Pool,
  fixtures: FixturesFCCPD,
): Promise<RoundResult> {
  const failures: string[] = [];
  const produtoId = await createProduto(pool, 1, fixtures.artesaoId, fixtures.categoriaId);
  const pedidoIds: string[] = [];

  try {
    const [respA, respB] = await Promise.all([
      postPedido(baseUrl, produtoId, fixtures.compradorId),
      postPedido(baseUrl, produtoId, fixtures.compradorId),
    ]);

    const statuses = [respA.status, respB.status].sort((a, b) => a - b);
    assertCondition(
      statuses[0] === 201 && statuses[1] === 409,
      `round ${round}: expected statuses [201,409], got ${JSON.stringify(statuses)}`,
      failures,
    );

    const winner = respA.status === 201 ? respA : respB.status === 201 ? respB : undefined;
    if (winner === undefined) {
      failures.push(`round ${round}: no response returned 201`);
    } else {
      const pedidoId = winner.body?.pedido?.id;
      if (typeof pedidoId === "string") {
        pedidoIds.push(pedidoId);
      } else {
        failures.push(`round ${round}: winning response missing pedido.id`);
      }
      assertCondition(
        winner.body?.pedido?.status === "confirmado",
        `round ${round}: winning order missing status confirmado`,
        failures,
      );
    }

    const estoqueFinal = await getEstoque(pool, produtoId);
    assertCondition(
      estoqueFinal === 0,
      `round ${round}: expected final stock 0, got ${estoqueFinal}`,
      failures,
    );
    assertCondition(
      estoqueFinal >= 0,
      `round ${round}: stock went negative (${estoqueFinal})`,
      failures,
    );

    const pedidosPersistidos = await countPedidosPersistidos(pool, produtoId);
    assertCondition(
      pedidosPersistidos === 1,
      `round ${round}: expected exactly 1 persisted order, found ${pedidosPersistidos}`,
      failures,
    );
  } finally {
    await limparRodada(pool, produtoId, pedidoIds);
  }

  return { round, failures };
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function main(): Promise<void> {
  const environment = parseEnvironment({
    ...process.env,
    PORT: process.env.CONCURRENCY_TEST_PORT ?? DEFAULT_PORT,
  });
  const pool = new Pool({ connectionString: environment.DATABASE_URL });
  const { server, prisma, boss } = await startServer({
    ...process.env,
    PORT: String(environment.PORT),
  });
  const baseUrl = `http://127.0.0.1:${environment.PORT}`;

  const artesaoId = await createUsuario(pool, "artesao");
  const categoriaId = await createCategoria(pool);
  const compradorId = await createUsuario(pool, "comprador");
  const fixtures: FixturesFCCPD = { artesaoId, categoriaId, compradorId };

  const allFailures: string[] = [];

  try {
    for (let round = 1; round <= ROUNDS; round += 1) {
      const result = await runRound(round, baseUrl, pool, fixtures);
      if (result.failures.length === 0) {
        console.log(
          `round ${round}: OK (1x201, 1x409, estoque final 0, 1 pedido persistido)`,
        );
      } else {
        console.error(`round ${round}: FAIL`);
        for (const failure of result.failures) {
          console.error(`  - ${failure}`);
        }
        allFailures.push(...result.failures);
      }
    }
  } finally {
    await pool.query('DELETE FROM "Usuario" WHERE "id" = ANY($1)', [
      [fixtures.artesaoId, fixtures.compradorId],
    ]);
    await pool.query('DELETE FROM "Categoria" WHERE "id" = $1', [fixtures.categoriaId]);
    if (boss !== undefined) {
      await boss.stop({ graceful: false });
    }
    await closeServer(server);
    await prisma.$disconnect();
    await pool.end();
  }

  if (allFailures.length > 0) {
    console.error(
      `Concurrency check failed: ${allFailures.length} assertion(s) did not hold.`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    "Concurrency check passed: 3/3 rounds confirmed exclusive checkout under stock=1.",
  );
}

main().catch((error: unknown) => {
  console.error(
    "Concurrency check crashed:",
    error instanceof Error ? error.message : "unknown error",
  );
  process.exitCode = 1;
});

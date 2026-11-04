import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import process from "node:process";
import console from "node:console";
import { test } from "node:test";
import { setTimeout } from "node:timers/promises";

const { fetch } = globalThis;

const root = fileURLToPath(new URL("../../../", import.meta.url));
const env = {
  ...process.env,
  COMPOSE_ENV_FILES: ".env.compose.example",
  COMPOSE_PROJECT_NAME: process.env.COMPOSE_PROJECT_NAME ?? "origem-35-3-smoke",
  ...Object.fromEntries(
    readFileSync(
      new URL("../../../.env.compose.example", import.meta.url),
      "utf8",
    )
      .split(/\r?\n/)
      .filter((line) => /^[A-Z_]+=/.test(line))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  ),
};

function compose(...args) {
  const result = spawnSync("docker", ["compose", ...args], {
    cwd: root,
    env,
    encoding: "utf8",
    timeout: 900_000,
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout;
}

function sql(statement) {
  return compose(
    "exec",
    "-T",
    "postgres",
    "psql",
    "-U",
    "origem_admin",
    "-d",
    "origem",
    "-Atc",
    statement,
  ).trim();
}

async function until(check) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await check()) return;
    await setTimeout(500);
  }
  assert.fail("A operação não terminou em 30 segundos");
}

test(
  "compose inicia imagens isoladas e processa pedidos exclusivamente no worker",
  { timeout: 1_200_000 },
  async (t) => {
    compose("config", "--quiet");
    console.log(
      compose("up", "--build", "--detach", "--wait", "--wait-timeout", "240"),
    );

    await t.test("serviços saudáveis e preparações concluídas", () => {
      const services = compose("ps", "--all", "--format", "json")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
      for (const name of ["postgres", "api", "worker", "recomendacao"]) {
        assert.equal(
          services.find((s) => s.Service === name)?.Health,
          "healthy",
          name,
        );
      }
      for (const name of ["migrate", "recomendacao-setup"]) {
        const service = services.find((s) => s.Service === name);
        assert.equal(service?.State, "exited", name);
        assert.equal(service?.ExitCode, 0, name);
      }
    });

    await t.test(
      "runtime sem root, ferramentas de desenvolvimento ou segredos nas camadas",
      () => {
        for (const service of ["api", "worker", "recomendacao"]) {
          compose(
            "exec",
            "-T",
            service,
            "node",
            "--input-type=module",
            "-e",
            `
        import assert from 'node:assert/strict';
        import { existsSync } from 'node:fs';
        assert.notEqual(process.getuid(), 0);
        for (const name of ['typescript', 'tsx', 'vitest', 'eslint']) assert.equal(existsSync('node_modules/' + name), false, name);
        assert.equal(existsSync('.env'), false);
        assert.equal(existsSync('dist/tests'), false);
        assert.equal(new URL(process.env.DATABASE_URL).username, '${service === "recomendacao" ? "recomendacao_app" : "origem_api_app"}');
        assert.equal(new URL(process.env.DIRECT_URL ?? process.env.DATABASE_URL).username, '${service === "recomendacao" ? "recomendacao_app" : "origem_api_app"}');
      `,
          );
        }
        for (const image of [
          "origem-backend:local",
          "origem-backend-migrate:local",
          "origem-recomendacao:local",
        ]) {
          const result = spawnSync("docker", ["history", "--no-trunc", image], {
            encoding: "utf8",
            windowsHide: true,
          });
          assert.equal(result.status, 0, result.stderr);
          for (const name of [
            "POSTGRES_PASSWORD",
            "API_DATABASE_PASSWORD",
            "RECOMENDACAO_DATABASE_PASSWORD",
            "JWT_SECRET",
            "RECOMENDACAO_SERVICE_TOKEN",
          ]) {
            assert.equal(result.stdout.includes(env[name]), false, name);
          }
        }
      },
    );

    await t.test("contratos e isolamento PostgreSQL reais", () => {
      compose(
        "exec",
        "-T",
        "recomendacao",
        "node",
        "--input-type=module",
        "-e",
        `
      import assert from 'node:assert/strict';
      import { Pool } from 'pg';
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      try {
        assert.ok((await pool.query('SELECT * FROM public.rec_produtos_elegiveis')).rowCount > 0);
        await pool.query('SELECT * FROM recomendacao.execucao_lote');
        await assert.rejects(pool.query('SELECT * FROM public."Produto"'), { code: '42501' });
      } finally { await pool.end(); }
    `,
      );
      compose(
        "exec",
        "-T",
        "api",
        "node",
        "--input-type=module",
        "-e",
        `
      import assert from 'node:assert/strict';
      import { Pool } from 'pg';
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      try { await assert.rejects(pool.query('SELECT * FROM recomendacao.execucao_lote'), { code: '42501' }); }
      finally { await pool.end(); }
    `,
      );
    });

    const origin = "http://127.0.0.1:3001";
    assert.equal((await fetch(`${origin}/health`)).status, 200);
    await t.test(
      "API recebe recomendações reais do microsserviço",
      async () => {
        const response = await fetch(`${origin}/recomendacoes`);
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.estrategia, "fallback-geral");
        assert.ok(body.itens.length > 0);
        const internal = JSON.parse(
          compose(
            "exec",
            "-T",
            "api",
            "node",
            "--input-type=module",
            "-e",
            `
      import assert from 'node:assert/strict';
      const response = await fetch(process.env.RECOMENDACAO_URL + '/recomendacoes', { headers: { 'X-Service-Token': process.env.RECOMENDACAO_SERVICE_TOKEN } });
      assert.equal(response.status, 200);
      process.stdout.write(JSON.stringify(await response.json()));
    `,
          ),
        );
        assert.deepEqual(
          body.itens.map((item) => item.id),
          internal.produtoIds,
        );
      },
    );

    await t.test(
      "pedido aguarda consumidor e gera log somente no worker",
      async () => {
        compose("stop", "worker");
        let pedidoId;
        try {
          const login = await fetch(`${origin}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: "ana.compradora@origem.test",
              senha: "senha-sintetica-comprador",
            }),
          });
          assert.equal(login.status, 200);
          const cookie = login.headers.get("set-cookie").split(";")[0];
          const produtoId = sql(
            'SELECT id FROM "Produto" WHERE ativo AND "quantidadeEstoque" > 0 ORDER BY id LIMIT 1',
          );
          const response = await fetch(`${origin}/pedidos`, {
            method: "POST",
            headers: { "Content-Type": "application/json", cookie },
            body: JSON.stringify({ itens: [{ produtoId, quantidade: 1 }] }),
          });
          assert.equal(response.status, 201);
          pedidoId = (await response.json()).pedido.id;
          assert.match(pedidoId, /^[a-f0-9-]{36}$/);
          await until(
            () =>
              sql(
                `SELECT status FROM "IntencaoNotificacao" WHERE "pedidoId" = '${pedidoId}'`,
              ) === "publicada",
          );
          await setTimeout(1500);
          assert.equal(
            sql(
              `SELECT tentativas FROM "IntencaoNotificacao" WHERE "pedidoId" = '${pedidoId}'`,
            ),
            "0",
          );
          assert.equal(
            sql(
              `SELECT count(*) FROM "Notificacao" WHERE "pedidoId" = '${pedidoId}'`,
            ),
            "0",
          );
        } finally {
          compose("start", "worker");
        }
        await until(
          () =>
            sql(
              `SELECT status FROM "IntencaoNotificacao" WHERE "pedidoId" = '${pedidoId}'`,
            ) === "processada",
        );
        assert.equal(
          sql(
            `SELECT count(*) FROM "Notificacao" WHERE "pedidoId" = '${pedidoId}'`,
          ),
          "1",
        );
        const workerLog = compose("logs", "--no-color", "worker");
        assert.ok(workerLog.includes(pedidoId));
        assert.equal(
          compose("logs", "--no-color", "api").includes(pedidoId),
          false,
        );
        console.log(workerLog);
      },
    );
  },
);

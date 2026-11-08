import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { escapeIdentifier } from "pg";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import { HttpRecomendacaoClient } from "../../src/integrations/recommendation/http-recomendacao.client.js";
import { RecomendacaoIndisponivelError } from "../../src/errors/recomendacao-indisponivel.error.js";
import { criarBancoRecomendacao } from "../helpers/recomendacao-database.js";

let banco: Awaited<ReturnType<typeof criarBancoRecomendacao>>;
let contexto: string;
let comprador: string;
const secret = "synthetic-integration-jwt-secret-with-32-characters";
beforeAll(async () => {
  banco = await criarBancoRecomendacao();
  const categoria = await banco.prisma.categoria.create({
    data: { nome: "HTTP real" },
  });
  const artesao = await banco.prisma.usuario.create({
    data: {
      nome: "Artesao",
      email: `${randomUUID()}@teste.origem`,
      senhaHash: "sintetico",
      papel: "artesao",
    },
  });
  comprador = (
    await banco.prisma.usuario.create({
      data: {
        nome: "Comprador",
        email: `${randomUUID()}@teste.origem`,
        senhaHash: "sintetico",
      },
    })
  ).id;
  const ids: string[] = [];
  for (let i = 0; i < 10; i++) {
    ids.push(
      (
        await banco.prisma.produto.create({
          data: {
            nome: `Produto ${i}`,
            descricao: "Sintetico",
            preco: 10,
            artesaoId: artesao.id,
            categoriaId: categoria.id,
            tecnicaId: "tecnica-modelagem-argila",
            quantidadeEstoque: 5,
          },
        })
      ).id,
    );
  }
  contexto = ids[0] as string;
  await banco.prisma.pedido.create({
    data: {
      compradorId: comprador,
      status: "confirmado",
      itens: { create: { produtoId: contexto, quantidade: 1 } },
    },
  });
}, 120000);
afterAll(async () => {
  await banco?.fechar();
}, 60000);

it.each(["/recomendacoes", "/recomendacoes/para-mim"])(
  "preserva IDs e ordem calculados pelo microsservico: %s",
  async (path) => {
    const pessoal = path.endsWith("para-mim");
    const app = createApp(banco.prisma, {
      JWT_SECRET: secret,
      COOKIE_SECURE: false,
      ...banco.environment,
    });
    const internal = await fetch(
      `${banco.environment.RECOMENDACAO_URL}${pessoal ? `/recomendacoes/historico?usuarioId=${comprador}` : `/recomendacoes?produtoId=${contexto}`}`,
      {
        headers: {
          "X-Service-Token": banco.environment.RECOMENDACAO_SERVICE_TOKEN,
        },
      },
    );
    expect(internal.status).toBe(200);
    const selecao = (await internal.json()) as {
      estrategia: string;
      produtoIds: string[];
    };
    expect(selecao.produtoIds).toHaveLength(8);
    const call = request(app).get(path);
    if (pessoal)
      call.set(
        "Cookie",
        `origem_sessao=${jwt.sign({ nome: "Comprador", papel: "comprador" }, secret, { subject: comprador, expiresIn: "1h" })}`,
      );
    else call.query({ produtoId: contexto });
    const response = await call;
    expect(response.status).toBe(200);
    expect(response.body.estrategia).toBe(selecao.estrategia);
    expect(response.body.itens.map((item: { id: string }) => item.id)).toEqual(
      selecao.produtoIds,
    );
  },
);

it.each([undefined, "id-invalido", randomUUID()])(
  "correlaciona logs HTTP com header recebido %s sem dados sensiveis",
  async (recebido) => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      const app = createApp(banco.prisma, {
        JWT_SECRET: secret,
        COOKIE_SECURE: false,
        ...banco.environment,
      });
      const call = request(app)
        .get(`/recomendacoes?produtoId=${contexto}`)
        .set("Cookie", "segredo=cookie-confidencial")
        .set("Authorization", "Bearer token-confidencial");
      if (recebido) call.set("X-Request-Id", recebido);
      const response = await call;
      expect(response.status).toBe(200);
      const requestId = response.headers["x-request-id"] as string;
      expect(requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      if (recebido && recebido !== "id-invalido")
        expect(requestId).toBe(recebido);
      else expect(requestId).not.toBe(recebido);
      const linhas = log.mock.calls.map(([linha]) => String(linha));
      const registros = linhas.map(
        (linha) => JSON.parse(linha) as Record<string, unknown>,
      );
      const acessos = registros.filter(
        (registro) => registro.requestId === requestId && "status" in registro,
      );
      expect(acessos).toHaveLength(2);
      expect(acessos.map((registro) => registro.servico).sort()).toEqual([
        "api",
        "recomendacao",
      ]);
      for (const registro of acessos) {
        expect(registro).toEqual({
          servico: expect.any(String),
          requestId,
          metodo: "GET",
          rota: "/recomendacoes",
          status: 200,
          duracaoMs: expect.any(Number),
        });
        expect(registro.duracaoMs).toBeGreaterThanOrEqual(0);
      }
      expect(linhas.join("\n")).not.toMatch(
        /cookie-confidencial|token-confidencial|produtoId=|id-invalido/,
      );
      expect(linhas.join("\n")).not.toContain(
        banco.environment.RECOMENDACAO_SERVICE_TOKEN,
      );
    } finally {
      log.mockRestore();
    }
  },
);

it("isola requestIds em chamadas concorrentes autenticadas", async () => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  try {
    const app = createApp(banco.prisma, {
      JWT_SECRET: secret,
      COOKIE_SECURE: false,
      ...banco.environment,
    });
    const ids = Array.from({ length: 4 }, () => randomUUID());
    const cookie = `origem_sessao=${jwt.sign({ papel: "comprador", nome: "Comprador" }, secret, { subject: comprador, expiresIn: "1h" })}`;
    const responses = await Promise.all(
      ids.map((id) =>
        request(app)
          .get("/recomendacoes/para-mim")
          .set("X-Request-Id", id)
          .set("Cookie", cookie),
      ),
    );
    expect(responses.map((response) => response.status)).toEqual([
      200, 200, 200, 200,
    ]);
    const registros = log.mock.calls.map(
      ([linha]) => JSON.parse(String(linha)) as Record<string, unknown>,
    );
    for (const id of ids) {
      const acessos = registros.filter(
        (registro) => registro.requestId === id && "status" in registro,
      );
      expect(acessos).toHaveLength(2);
      expect(acessos.map((registro) => registro.rota).sort()).toEqual([
        "/recomendacoes/historico",
        "/recomendacoes/para-mim",
      ]);
    }
    expect(JSON.stringify(registros)).not.toContain(cookie);
    expect(JSON.stringify(registros)).not.toContain(comprador);
  } finally {
    log.mockRestore();
  }
});

it.each([
  ["/ausente/email-privado@teste.test?token=confidencial", 404],
  ["/recomendacoes?produtoId=invalido&email=privado@teste.test", 400],
  ["/recomendacoes/para-mim", 401],
] as const)("registra erros sem expor entrada em %s", async (url, status) => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  try {
    const app = createApp(banco.prisma, {
      JWT_SECRET: secret,
      COOKIE_SECURE: false,
      ...banco.environment,
    });
    const response = await request(app)
      .get(url)
      .set("X-Request-Id", "privado@teste.test");
    expect(response.status).toBe(status);
    const acessos = log.mock.calls.map(
      ([linha]) => JSON.parse(String(linha)) as Record<string, unknown>,
    );
    expect(acessos).toHaveLength(1);
    expect(acessos[0]).toMatchObject({
      servico: "api",
      requestId: response.headers["x-request-id"],
      status,
    });
    expect(JSON.stringify(acessos)).not.toMatch(/privado|confidencial|\?/);
  } finally {
    log.mockRestore();
  }
});

it("recusa token errado com falha tipada de status", async () => {
  const client = new HttpRecomendacaoClient({
    ...banco.environment,
    RECOMENDACAO_SERVICE_TOKEN: "wrong-synthetic-token-with-32-characters",
  });
  await expect(client.obter({})).rejects.toMatchObject({ motivo: "status" });
});

it("usa papel restrito e migrations no schema privado", async () => {
  const {
    rows: [identity],
  } = await banco.micro.rec.query<{ papel: string; tabelas: boolean }>(
    "SELECT current_user AS papel, has_table_privilege(current_user, $1, 'SELECT') AS tabelas",
    [`${escapeIdentifier(banco.schema)}."Produto"`],
  );
  expect(identity).toEqual({ papel: banco.micro.recRole, tabelas: false });
  const migrations = await banco.micro.rec.query(
    `SELECT nome FROM ${escapeIdentifier(banco.micro.recSchema)}.schema_migrations`,
  );
  expect(migrations.rowCount).toBeGreaterThan(0);
});

it("microsservico desligado gera falha tipada e rota controlada", async () => {
  await banco.micro.parar();
  const schemas = await banco.pool.query(
    "SELECT 1 FROM pg_namespace WHERE nspname=$1",
    [banco.micro.recSchema],
  );
  expect(schemas.rowCount).toBe(0);
  const roles = await banco.pool.query(
    "SELECT 1 FROM pg_roles WHERE rolname=ANY($1::text[])",
    [[banco.micro.recRole, banco.micro.apiRole]],
  );
  expect(roles.rowCount).toBe(0);
  const error = await banco.client.obter({}).catch((error: unknown) => error);
  expect(error).toBeInstanceOf(RecomendacaoIndisponivelError);
  expect(error).toMatchObject({ motivo: "rede" });
  const app = createApp(banco.prisma, {
    COOKIE_SECURE: false,
    ...banco.environment,
  });
  const response = await request(app).get("/recomendacoes");
  expect(response.status).toBe(200);
  expect(response.body.estrategia).toBe("fallback-local");
  expect(response.body.itens).toHaveLength(8);
  expect(response.headers["x-cache"]).toBe("MISS");
  expect(response.text).not.toContain(
    banco.environment.RECOMENDACAO_SERVICE_TOKEN,
  );
});

import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { escapeIdentifier } from "pg";
import { afterAll, beforeAll, expect, it } from "vitest";
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
  for (let i = 0; i < 4; i++) {
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
    expect(selecao.produtoIds).toHaveLength(3);
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
  expect(response.status).toBe(503);
  expect(response.body).toEqual({
    status: "error",
    message: "Service unavailable",
  });
  expect(response.text).not.toContain(
    banco.environment.RECOMENDACAO_SERVICE_TOKEN,
  );
});

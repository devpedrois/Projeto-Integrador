import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { criarBancoAuth } from "../helpers/auth-database.js";
import { criarMassaIndicadoresAdmin } from "../helpers/indicadores-admin-fixture.js";

const secret = "segredo-sintetico-exclusivo-32-1-indicadores";
let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let vazio: Awaited<ReturnType<typeof criarBancoAuth>>;
let massa: Awaited<ReturnType<typeof criarMassaIndicadoresAdmin>>;
let app: ReturnType<typeof createApp>;
let appVazio: ReturnType<typeof createApp>;
let adminVazio: string;

function cookie(id: string) {
  return `origem_sessao=${jwt.sign({ papel: "admin", nome: "Pessoa sintetica" }, secret, { subject: id, expiresIn: "1h" })}`;
}

beforeAll(async () => {
  banco = await criarBancoAuth();
  vazio = await criarBancoAuth();
  massa = await criarMassaIndicadoresAdmin(banco.prisma);
  adminVazio = (
    await vazio.prisma.usuario.create({
      data: {
        nome: "Admin sintetico",
        email: `${randomUUID()}@teste.origem`,
        senhaHash: "sintetico",
        papel: "admin",
      },
    })
  ).id;
  app = createApp(banco.prisma, { JWT_SECRET: secret, COOKIE_SECURE: false });
  appVazio = createApp(vazio.prisma, {
    JWT_SECRET: secret,
    COOKIE_SECURE: false,
  });
}, 120000);

afterAll(async () => {
  await banco?.fechar();
  await vazio?.fechar();
}, 60000);

describe("32.1 GET /admin/indicadores", () => {
  it("herda 401 anonimo da protecao /admin", async () => {
    const response = await request(app).get("/admin/indicadores");
    expect(response.status).toBe(401);
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it.each(["comprador", "artesao"] as const)(
    "rejeita %s mesmo com papel admin forjado no token",
    async (papel) => {
      const response = await request(app)
        .get("/admin/indicadores")
        .set("Cookie", cookie(massa[papel].id));
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("ACESSO_NEGADO");
      expect(response.headers["cache-control"]).toBe("no-store");
    },
  );

  it("retorna os valores de 33.3 com Decimal de duas casas e ISO", async () => {
    const inicio = Date.now();
    const response = await request(app)
      .get("/admin/indicadores")
      .set("Cookie", cookie(massa.admin.id));
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      artesaosAtivos: 3,
      produtosAtivos: 3,
      pedidosConfirmados: 4,
      receitaTotal: "100000000.29",
      atualizadoEm: expect.any(String),
    });
    expect(new Date(response.body.atualizadoEm).toISOString()).toBe(
      response.body.atualizadoEm,
    );
    expect(Date.parse(response.body.atualizadoEm)).toBeGreaterThanOrEqual(
      inicio,
    );
    expect(Date.parse(response.body.atualizadoEm)).toBeLessThanOrEqual(
      Date.now(),
    );
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it.each([
    "?usuarioId=externo",
    "?limit=10",
    "?x=1&x=2",
    "?filtro[ativo]=true",
  ])("rejeita query nao vazia %s", async (query) => {
    const response = await request(app)
      .get(`/admin/indicadores${query}`)
      .set("Cookie", cookie(massa.admin.id));
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDACAO");
  });

  it("retorna zeros sem registros elegiveis", async () => {
    const response = await request(appVazio)
      .get("/admin/indicadores")
      .set("Cookie", cookie(adminVazio));
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      artesaosAtivos: 0,
      produtosAtivos: 0,
      pedidosConfirmados: 0,
      receitaTotal: "0.00",
      atualizadoEm: expect.any(String),
    });
  });

  it("revalida admin desativado no banco", async () => {
    await vazio.prisma.usuario.update({
      where: { id: adminVazio },
      data: { ativo: false },
    });
    try {
      const response = await request(appVazio)
        .get("/admin/indicadores")
        .set("Cookie", cookie(adminVazio));
      expect(response.status).toBe(401);
    } finally {
      await vazio.prisma.usuario.update({
        where: { id: adminVazio },
        data: { ativo: true },
      });
    }
  });
});

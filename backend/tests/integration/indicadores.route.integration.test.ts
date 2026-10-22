import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import type { StatusPedido } from "../../src/generated/prisma/enums.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

const secret = "segredo-sintetico-exclusivo-bd3-indicadores";
let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let app: ReturnType<typeof createApp>;
let artesaoA: string;
let artesaoB: string;
let semVenda: string;
let semProduto: string;
let compradorId: string;
let adminId: string;

function cookie(id: string, papel = "artesao") {
  return `origem_sessao=${jwt.sign({ papel, nome: "Pessoa sintetica BD.3" }, secret, { subject: id, expiresIn: "1h" })}`;
}

beforeAll(async () => {
  banco = await criarBancoAuth();
  app = createApp(banco.prisma, { JWT_SECRET: secret, COOKIE_SECURE: false });
  const usuarios = [];
  for (const papel of [
    "artesao",
    "artesao",
    "artesao",
    "artesao",
    "comprador",
    "admin",
  ] as const) {
    usuarios.push(
      await banco.prisma.usuario.create({
        data: {
          nome: "Pessoa sintetica BD.3",
          email: `${randomUUID()}@teste.origem`,
          senhaHash: "hash-sintetico",
          papel,
        },
      }),
    );
  }
  [artesaoA, artesaoB, semVenda, semProduto, compradorId, adminId] =
    usuarios.map((usuario) => usuario.id) as [
      string,
      string,
      string,
      string,
      string,
      string,
    ];
  const categoria = await banco.prisma.categoria.create({
    data: { nome: "Categoria BD.3" },
  });
  const produtos = [];
  for (const artesaoId of [artesaoA, artesaoA, artesaoB, semVenda]) {
    produtos.push(
      await banco.prisma.produto.create({
        data: {
          artesaoId,
          categoriaId: categoria.id,
          tecnicaId: "tecnica-modelagem-argila",
          nome: "Produto sintetico BD.3",
          descricao: "Historico de vendas",
          preco: 999,
          quantidadeEstoque: 0,
          quantidadeVendida: 900,
          ativo: false,
          desativadoPorAdmin: true,
        },
      }),
    );
  }
  const [a1, a2, b1, semConfirmacao] = produtos;
  if (!a1 || !a2 || !b1 || !semConfirmacao)
    throw new Error("Fixture BD.3 incompleta");
  async function pedido(
    status: StatusPedido,
    criadoEm: string,
    itens: { produtoId: string; quantidade: number; subtotal: string }[],
  ) {
    await banco.prisma.pedido.create({
      data: {
        compradorId,
        status,
        numero: `BD3-${randomUUID()}`,
        total: "9999.99",
        criadoEm: new Date(criadoEm),
        itens: {
          create: itens.map((item) => ({ ...item, precoUnitario: "999.00" })),
        },
      },
    });
  }
  await pedido("confirmado", "2026-10-12T12:00:00.000Z", [
    { produtoId: a1.id, quantidade: 2, subtotal: "20.22" },
    { produtoId: a1.id, quantidade: 1, subtotal: "10.11" },
    { produtoId: a2.id, quantidade: 3, subtotal: "21.09" },
    { produtoId: b1.id, quantidade: 5, subtotal: "15.45" },
  ]);
  await pedido("confirmado", "2026-10-13T12:00:00.000Z", [
    { produtoId: a1.id, quantidade: 4, subtotal: "0.41" },
  ]);
  await pedido("confirmado", "2026-10-14T12:00:00.000Z", [
    { produtoId: b1.id, quantidade: 1, subtotal: "100.00" },
  ]);
  for (const status of ["pendente", "cancelado"] as const) {
    await pedido(status, "2026-10-22T12:00:00.000Z", [
      { produtoId: a1.id, quantidade: 99, subtotal: "999.99" },
      { produtoId: b1.id, quantidade: 99, subtotal: "999.99" },
      { produtoId: semConfirmacao.id, quantidade: 99, subtotal: "999.99" },
    ]);
  }
  await banco.prisma.produtoFoto.createMany({
    data: [0, 1].map((ordem) => ({
      produtoId: a1.id,
      ordem,
      url: "/fixture.svg",
    })),
  });
  await banco.prisma.avaliacao.createMany({
    data: [compradorId, adminId].map((id) => ({
      produtoId: a1.id,
      compradorId: id,
      nota: 5,
    })),
  });
}, 60000);

afterAll(async () => {
  await banco?.fechar();
});

describe("BD.3 GET /artesao/indicadores", () => {
  it("soma apenas itens próprios confirmados sem fanout ou reprecificação", async () => {
    const [inicio] = await banco.prisma.$queryRaw<
      { instante: Date }[]
    >`SELECT clock_timestamp() AS instante`;
    const response = await request(app)
      .get("/artesao/indicadores")
      .set("Cookie", cookie(artesaoA));
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      quantidadeVendida: 10,
      receitaTotal: 51.83,
      numeroPedidos: 2,
      ultimaVenda: "2026-10-13T12:00:00.000Z",
      atualizadoEm: expect.any(String),
    });
    const [fim] = await banco.prisma.$queryRaw<
      { instante: Date }[]
    >`SELECT clock_timestamp() AS instante`;
    if (!inicio || !fim) throw new Error("Relogio PostgreSQL indisponivel");
    expect(Date.parse(response.body.atualizadoEm)).toBeGreaterThanOrEqual(
      inicio.instante.getTime(),
    );
    expect(Date.parse(response.body.atualizadoEm)).toBeLessThanOrEqual(
      fim.instante.getTime(),
    );
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("isola o segundo artesão em pedidos compartilhados", async () => {
    const response = await request(app)
      .get("/artesao/indicadores")
      .set("Cookie", cookie(artesaoB));
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      quantidadeVendida: 6,
      receitaTotal: 115.45,
      numeroPedidos: 2,
      ultimaVenda: "2026-10-14T12:00:00.000Z",
    });
  });

  it.each(["sem vendas", "sem produtos"])(
    "retorna zeros para artesão %s",
    async (cenario) => {
      const response = await request(app)
        .get("/artesao/indicadores")
        .set(
          "Cookie",
          cookie(cenario === "sem vendas" ? semVenda : semProduto),
        );
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        quantidadeVendida: 0,
        receitaTotal: 0,
        numeroPedidos: 0,
        ultimaVenda: null,
        atualizadoEm: expect.any(String),
      });
    },
  );

  it("rejeita identidade externa pela query", async () => {
    const response = await request(app)
      .get("/artesao/indicadores")
      .query({ artesaoId: artesaoB })
      .set("Cookie", cookie(artesaoA));
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDACAO");
  });

  it("rejeita anônimo", async () => {
    expect((await request(app).get("/artesao/indicadores")).status).toBe(401);
  });

  it.each(["comprador", "admin"])(
    "rejeita papel %s mesmo com papel forjado no token",
    async (papel) => {
      const response = await request(app)
        .get("/artesao/indicadores")
        .set("Cookie", cookie(papel === "comprador" ? compradorId : adminId));
      expect(response.status).toBe(403);
    },
  );

  it("documenta indicadores e segurança no OpenAPI", async () => {
    const response = await request(app).get("/docs/openapi.json");
    const operacao = response.body.paths["/artesao/indicadores"]?.get;
    expect(operacao?.security).toEqual([{ sessao: [] }]);
    for (const status of ["200", "400", "401", "403"])
      expect(operacao?.responses).toHaveProperty(status);
    expect(
      operacao.responses["200"].content["application/json"].example,
    ).toMatchObject({
      quantidadeVendida: expect.any(Number),
      receitaTotal: expect.any(Number),
      numeroPedidos: expect.any(Number),
      ultimaVenda: expect.any(String),
      atualizadoEm: expect.any(String),
    });
  });
});

import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let app: ReturnType<typeof createApp>;
const contas: Record<string, { id: string; cookie: string }> = {};
const produtoA = randomUUID();
const produtoB = randomUUID();
const produtoC = randomUUID();
const compartilhado = randomUUID();
const antigo = randomUUID();

function conta(papel: string) {
  const resultado = contas[papel];
  if (!resultado) throw new Error("Conta sintetica Web.1 ausente");
  return resultado;
}

beforeAll(async () => {
  banco = await criarBancoAuth();
  app = createApp(banco.prisma, {
    JWT_SECRET: "segredo-sintetico-web1-apenas-testes",
    COOKIE_SECURE: false,
  });
  for (const nome of ["comprador", "artesaoA", "artesaoB", "vazio", "admin"]) {
    const email = `${randomUUID()}@teste.origem`;
    const senha = "SenhaSinteticaWeb1!";
    const cadastro = await request(app)
      .post("/auth/register")
      .send({
        nome: nome === "comprador" ? "Comprador sintetico Web.1" : nome,
        email,
        senha,
        papel:
          nome === "comprador" || nome === "admin" ? "comprador" : "artesao",
      });
    expect(cadastro.status).toBe(201);
    if (nome === "admin") {
      await banco.prisma.usuario.update({
        where: { id: cadastro.body.id },
        data: { papel: "admin" },
      });
    }
    const login = await request(app).post("/auth/login").send({ email, senha });
    expect(login.status).toBe(200);
    const cookies: unknown = login.headers["set-cookie"];
    const cookie =
      Array.isArray(cookies) && typeof cookies[0] === "string"
        ? cookies[0].split(";")[0]
        : undefined;
    if (!cookie) throw new Error("Sessao sintetica Web.1 ausente");
    contas[nome] = { id: cadastro.body.id, cookie };
  }
  const categoria = await banco.prisma.categoria.create({
    data: { nome: "Web.1" },
  });
  for (const [id, nome, artesao] of [
    [produtoA, "Peca A", "artesaoA"],
    [produtoB, "Peca B", "artesaoB"],
    [produtoC, "Peca C", "artesaoA"],
  ] as const) {
    await banco.prisma.produto.create({
      data: {
        id,
        nome,
        artesaoId: conta(artesao).id,
        descricao: "Fixture sintetica Web.1",
        preco: "999.99",
        quantidadeEstoque: 0,
        ativo: false,
        categoriaId: categoria.id,
        tecnicaId: "tecnica-modelagem-argila",
      },
    });
  }
  const fixtures = [
    {
      id: antigo,
      numero: "WEB1-ANTIGO",
      status: "confirmado",
      data: "2026-10-10",
      produtos: [produtoA],
    },
    {
      id: compartilhado,
      numero: "WEB1-COMPARTILHADO",
      status: "confirmado",
      data: "2026-10-12",
      produtos: [produtoA, produtoB, produtoC],
    },
    {
      id: randomUUID(),
      numero: "WEB1-ALHEIO",
      status: "confirmado",
      data: "2026-10-13",
      produtos: [produtoB],
    },
    {
      id: randomUUID(),
      numero: "WEB1-PENDENTE",
      status: "pendente",
      data: "2026-10-14",
      produtos: [produtoA, produtoB],
    },
    {
      id: randomUUID(),
      numero: "WEB1-CANCELADO",
      status: "cancelado",
      data: "2026-10-15",
      produtos: [produtoA, produtoB],
    },
  ] as const;
  for (const fixture of fixtures) {
    await banco.prisma.pedido.create({
      data: {
        id: fixture.id,
        numero: fixture.numero,
        status: fixture.status,
        compradorId: conta("comprador").id,
        compradorRef: "Legado privado",
        total: "9876.54",
        criadoEm: new Date(`${fixture.data}T12:00:00.000Z`),
        itens: {
          create: fixture.produtos.map((produtoId) => ({
            produtoId,
            quantidade: produtoId === produtoA ? 3 : 2,
            precoUnitario: produtoId === produtoB ? "20.50" : "0.10",
            subtotal:
              produtoId === produtoB
                ? "41.00"
                : produtoId === produtoA
                  ? "0.30"
                  : "0.20",
          })),
        },
      },
    });
  }
}, 60_000);

afterAll(async () => {
  await banco?.fechar();
});

describe("Web.1 pedidos do artesao em PostgreSQL real", () => {
  it("isola o payload inteiro e soma somente os proprios itens", async () => {
    for (const artesao of ["artesaoA", "artesaoB"]) {
      const response = await request(app)
        .get("/artesao/pedidos")
        .set("Cookie", conta(artesao).cookie);
      expect(response.status).toBe(200);
      const pedido = response.body.itens.find(
        (item: { id: string }) => item.id === compartilhado,
      );
      const itens =
        artesao === "artesaoA"
          ? [
              {
                produtoId: produtoA,
                nome: "Peca A",
                quantidade: 3,
                precoUnitario: 0.1,
                subtotal: 0.3,
              },
              {
                produtoId: produtoC,
                nome: "Peca C",
                quantidade: 2,
                precoUnitario: 0.1,
                subtotal: 0.2,
              },
            ]
          : [
              {
                produtoId: produtoB,
                nome: "Peca B",
                quantidade: 2,
                precoUnitario: 20.5,
                subtotal: 41,
              },
            ];
      expect(pedido).toEqual({
        id: compartilhado,
        numero: "WEB1-COMPARTILHADO",
        criadoEm: "2026-10-12T12:00:00.000Z",
        nomeComprador: "Comprador sintetico Web.1",
        itens: expect.arrayContaining(itens),
        subtotalArtesao: artesao === "artesaoA" ? 0.5 : 41,
      });
      expect(pedido.itens).toHaveLength(itens.length);
      const proibidos =
        artesao === "artesaoA" ? [produtoB] : [produtoA, produtoC];
      for (const id of proibidos) expect(response.text).not.toContain(id);
      expect(response.text).not.toMatch(
        /email|senha|compradorId|compradorRef|pagamento|9876\.54|999\.99/,
      );
      for (const item of response.body.itens) {
        expect(Object.keys(item).sort()).toEqual([
          "criadoEm",
          "id",
          "itens",
          "nomeComprador",
          "numero",
          "subtotalArtesao",
        ]);
      }
      expect(response.headers["cache-control"]).toBe("no-store");
    }
  });

  it("filtra confirmados antes de paginar e ordena por data decrescente", async () => {
    const primeira = await request(app)
      .get("/artesao/pedidos?limit=1&offset=0")
      .set("Cookie", conta("artesaoA").cookie);
    const segunda = await request(app)
      .get("/artesao/pedidos?limit=1&offset=1")
      .set("Cookie", conta("artesaoA").cookie);
    expect(primeira.status).toBe(200);
    expect(segunda.status).toBe(200);
    expect(primeira.body).toEqual({
      itens: [expect.objectContaining({ id: compartilhado })],
      limit: 1,
      offset: 0,
      total: 2,
    });
    expect(segunda.body).toEqual({
      itens: [expect.objectContaining({ id: antigo, subtotalArtesao: 0.3 })],
      limit: 1,
      offset: 1,
      total: 2,
    });
    const fim = await request(app)
      .get("/artesao/pedidos?limit=100&offset=10000")
      .set("Cookie", conta("artesaoA").cookie);
    expect(fim.status).toBe(200);
    expect(fim.body).toEqual({
      itens: [],
      limit: 100,
      offset: 10000,
      total: 2,
    });
  });

  it("retorna lista vazia para artesao sem produtos", async () => {
    const response = await request(app)
      .get("/artesao/pedidos")
      .set("Cookie", conta("vazio").cookie);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      itens: [],
      limit: 10,
      offset: 0,
      total: 0,
    });
  });

  it("exige sessao e restringe o papel a artesao", async () => {
    expect((await request(app).get("/artesao/pedidos")).status).toBe(401);
    for (const papel of ["comprador", "admin"]) {
      expect(
        (
          await request(app)
            .get("/artesao/pedidos")
            .set("Cookie", conta(papel).cookie)
        ).status,
      ).toBe(403);
    }
    expect(
      (
        await request(app)
          .get("/pedidos")
          .set("Cookie", conta("artesaoA").cookie)
      ).status,
    ).toBe(403);
  });

  it.each([
    "limit=0",
    "limit=101",
    "limit=-1",
    "limit=1.5",
    "limit=abc",
    "offset=-1",
    "offset=1.5",
    "offset=10001",
    "offset=Infinity",
    "limit=1&limit=2",
    "offset=0&offset=1",
    "limit[x]=1",
    "artesaoId=outro",
    "compradorId=outro",
    "escopo=artesao",
    "status=pendente",
  ])("rejeita parametros invalidos: %s", async (query) => {
    const response = await request(app)
      .get(`/artesao/pedidos?${query}`)
      .set("Cookie", conta("artesaoA").cookie);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDACAO");
    expect(response.text).not.toMatch(/Prisma|SELECT|stack/i);
  });

  it("revalida papel e atividade apos emitir o token", async () => {
    const usuario = conta("vazio");
    await banco.prisma.usuario.update({
      where: { id: usuario.id },
      data: { papel: "comprador" },
    });
    try {
      expect(
        (
          await request(app)
            .get("/artesao/pedidos")
            .set("Cookie", usuario.cookie)
        ).status,
      ).toBe(403);
      await banco.prisma.usuario.update({
        where: { id: usuario.id },
        data: { papel: "artesao", ativo: false },
      });
      expect(
        (
          await request(app)
            .get("/artesao/pedidos")
            .set("Cookie", usuario.cookie)
        ).status,
      ).toBe(401);
    } finally {
      await banco.prisma.usuario.update({
        where: { id: usuario.id },
        data: { papel: "artesao", ativo: true },
      });
    }
  });
});

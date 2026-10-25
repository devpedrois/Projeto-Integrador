import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let app: ReturnType<typeof createApp>;
let compradorId: string;
let cookie: string;
let outroCookie: string;
let artesaoCookie: string;
const ids: string[] = [];

function exigir<T>(value: T | null | undefined): T {
  if (value === undefined || value === null)
    throw new Error("Fixture WEB11 incompleta");
  return value;
}

beforeAll(async () => {
  banco = await criarBancoAuth();
  app = createApp(banco.prisma, {
    JWT_SECRET: "segredo-sintetico-web11-apenas-testes",
    COOKIE_SECURE: false,
  });
  const sessoes: { id: string; cookie: string }[] = [];
  for (const papel of ["comprador", "comprador", "artesao"] as const) {
    const email = `${randomUUID()}@teste.origem`;
    const senha = "SenhaSinteticaWEB11!";
    const cadastro = await request(app).post("/auth/register").send({
      nome: "Conta sintetica WEB11",
      email,
      senha,
      papel,
    });
    expect(cadastro.status).toBe(201);
    const login = await request(app).post("/auth/login").send({ email, senha });
    const cookies: unknown = login.headers["set-cookie"];
    const sessao =
      Array.isArray(cookies) && typeof cookies[0] === "string"
        ? cookies[0].split(";")[0]
        : undefined;
    if (!sessao) throw new Error("Sessao sintetica ausente");
    sessoes.push({ id: cadastro.body.id, cookie: sessao });
  }
  compradorId = exigir(sessoes[0]).id;
  cookie = exigir(sessoes[0]).cookie;
  outroCookie = exigir(sessoes[1]).cookie;
  artesaoCookie = exigir(sessoes[2]).cookie;
  const categoria = await banco.prisma.categoria.create({
    data: { nome: "WEB11" },
  });
  const produtos = await Promise.all(
    ["13.37", "0.10"].map((preco) =>
      banco.prisma.produto.create({
        data: {
          nome: `Peca sintetica ${preco}`,
          descricao: "WEB11",
          preco,
          quantidadeEstoque: 100,
          artesaoId: exigir(sessoes[2]).id,
          categoriaId: categoria.id,
          tecnicaId: "tecnica-modelagem-argila",
        },
      }),
    ),
  );
  for (let indice = 0; indice < 3; indice += 1) {
    const response = await request(app)
      .post("/pedidos")
      .set("Cookie", cookie)
      .send({
        itens: [
          { produtoId: exigir(produtos[0]).id, quantidade: indice + 1 },
          { produtoId: exigir(produtos[1]).id, quantidade: 3 },
        ],
      });
    expect(response.status).toBe(201);
    const id: string = response.body.pedido.id;
    ids.push(id);
    await banco.prisma.pedido.update({
      where: { id },
      data: {
        criadoEm: new Date(`2026-10-${10 + indice}T12:00:00.000Z`),
        status: exigir(
          (["pendente", "confirmado", "cancelado"] as const)[indice],
        ),
      },
    });
  }
  await banco.prisma.pagamento.update({
    where: { pedidoId: exigir(ids[2]) },
    data: { status: "recusado" },
  });
}, 40_000);

afterAll(async () => {
  await banco?.fechar();
});

describe("WEB-11 meus pedidos em PostgreSQL real", () => {
  it("lista somente os pedidos do token, em data decrescente e com pagamento", async () => {
    const response = await request(app).get("/pedidos").set("Cookie", cookie);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ pagina: 1, limite: 10, total: 3 });
    expect(
      response.body.itens.map((pedido: { id: string }) => pedido.id),
    ).toEqual([...ids].reverse());
    expect(
      response.body.itens.map((pedido: { status: string }) => pedido.status),
    ).toEqual(["cancelado", "confirmado", "pendente"]);
    expect(response.body.itens[0].pagamento.status).toBe("recusado");
    const vazio = await request(app).get("/pedidos").set("Cookie", outroCookie);
    expect(vazio.status).toBe(200);
    expect(vazio.body).toEqual({ itens: [], pagina: 1, limite: 10, total: 0 });
  });

  it("pagina sem repetir pedidos e informa total", async () => {
    const primeira = await request(app)
      .get("/pedidos?pagina=1&limite=2")
      .set("Cookie", cookie);
    const segunda = await request(app)
      .get("/pedidos?pagina=2&limite=2")
      .set("Cookie", cookie);
    expect(primeira.status).toBe(200);
    expect(segunda.status).toBe(200);
    expect(primeira.body).toMatchObject({ pagina: 1, limite: 2, total: 3 });
    expect(
      segunda.body.itens.map((pedido: { id: string }) => pedido.id),
    ).toEqual([ids[0]]);
    expect(
      primeira.body.itens.map((pedido: { id: string }) => pedido.id),
    ).toEqual([ids[2], ids[1]]);
  });

  it.each([0, 1, 2])(
    "confere itens e valores do pedido %i contra o banco",
    async (indice) => {
      const id = exigir(ids[indice]);
      const response = await request(app)
        .get(`/pedidos/${id}`)
        .set("Cookie", cookie);
      expect(response.status).toBe(200);
      const registro = await banco.prisma.pedido.findUniqueOrThrow({
        where: { id },
        include: {
          pagamento: true,
          itens: {
            include: { produto: { select: { nome: true } } },
            orderBy: { id: "asc" },
          },
        },
      });
      expect(response.body.pedido).toEqual({
        id,
        compradorId,
        numero: registro.numero,
        total: exigir(registro.total).toNumber(),
        status: registro.status,
        criadoEm: registro.criadoEm.toISOString(),
      });
      expect(response.body.itens).toEqual(
        registro.itens.map((item) => ({
          id: item.id,
          status: "aguardando_envio",
          enviadoEm: null,
          produtoId: item.produtoId,
          nome: item.produto.nome,
          quantidade: item.quantidade,
          precoUnitario: exigir(item.precoUnitario).toNumber(),
          subtotal: exigir(item.subtotal).toNumber(),
        })),
      );
      const pagamento = exigir(registro.pagamento);
      expect(response.body.pagamento).toEqual({
        id: pagamento.id,
        metodo: pagamento.metodo,
        status: pagamento.status,
        valor: pagamento.valor.toNumber(),
        dataPagamento: pagamento.dataPagamento.toISOString(),
      });
      expect(response.text).not.toMatch(
        /senhaHash|compradorRef|email|senha|cookie/i,
      );
    },
  );

  it.each(["/pedidos", `/pedidos/00000000-0000-4000-8000-000000000000`])(
    "%s exige sessao e papel comprador",
    async (path) => {
      expect((await request(app).get(path)).status).toBe(401);
      expect(
        (await request(app).get(path).set("Cookie", artesaoCookie)).status,
      ).toBe(403);
    },
  );

  it.each([
    "pagina=0",
    "pagina=-1",
    "pagina=1.5",
    "pagina=10001",
    "limite=101",
    "limite=0",
    "limite=abc",
    "pagina=1&pagina=2",
    "compradorId=outro",
  ])("rejeita query invalida: %s", async (query) => {
    const response = await request(app)
      .get(`/pedidos?${query}`)
      .set("Cookie", cookie);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDACAO");
  });

  it("rejeita UUID invalido na borda", async () => {
    const response = await request(app)
      .get("/pedidos/invalido")
      .set("Cookie", cookie);
    expect(response.status).toBe(400);
    expect(response.text).not.toMatch(/Prisma|SELECT|stack/i);
  });

  it("impede cache das leituras privadas", async () => {
    const lista = await request(app).get("/pedidos").set("Cookie", cookie);
    const detalhe = await request(app)
      .get(`/pedidos/${ids[0]}`)
      .set("Cookie", cookie);
    expect(lista.headers["cache-control"]).toBe("no-store");
    expect(detalhe.headers["cache-control"]).toBe("no-store");
  });

  it("preserva ausencia de valores e pagamento em pedido legado", async () => {
    const legado = await banco.prisma.pedido.create({
      data: { compradorId, status: "pendente" },
    });
    const response = await request(app)
      .get(`/pedidos/${legado.id}`)
      .set("Cookie", cookie);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      pedido: { total: null, status: "pendente" },
      itens: [],
      pagamento: null,
    });
  });
});

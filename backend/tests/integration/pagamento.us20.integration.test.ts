import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let app: ReturnType<typeof createApp>;
let compradorId: string;
let outroCompradorId: string;
let cookie: string;
let outroCookie: string;
let artesaoId: string;
let categoriaId: string;

async function produto(estoque = 20, preco = "12.35") {
  return banco.prisma.produto.create({
    data: {
      nome: "Vaso sintetico US20",
      descricao: "Fixture de checkout",
      preco,
      quantidadeEstoque: estoque,
      artesaoId,
      categoriaId,
      tecnicaId: "tecnica-modelagem-argila",
    },
  });
}

function confirmar(
  itens: { produtoId: string; quantidade: number }[],
  sessao = cookie,
) {
  return request(app).post("/pedidos").set("Cookie", sessao).send({ itens });
}

async function carrinho(produtoId: string, quantidade = 1, sessao = cookie) {
  const response = await request(app)
    .post("/carrinho/itens")
    .set("Cookie", sessao)
    .send({ produtoId, quantidade });
  expect(response.status).toBe(200);
}

beforeAll(
  async () => {
    banco = await criarBancoAuth();
    app = createApp(banco.prisma, {
      JWT_SECRET: "segredo-sintetico-exclusivo-checkout-us20",
      COOKIE_SECURE: false,
    });
    for (let indice = 0; indice < 2; indice += 1) {
      const email = `${randomUUID()}@teste.origem`;
      const senha = "SenhaSinteticaUS20!";
      const cadastro = await request(app).post("/auth/register").send({
        nome: "Comprador sintetico US20",
        email,
        senha,
        papel: "comprador",
      });
      expect(cadastro.status).toBe(201);
      const login = await request(app)
        .post("/auth/login")
        .send({ email, senha });
      expect(login.status).toBe(200);
      const cookies: unknown = login.headers["set-cookie"];
      const sessao =
        Array.isArray(cookies) && typeof cookies[0] === "string"
          ? cookies[0].split(";")[0]
          : undefined;
      if (!sessao) throw new Error("Sessao de teste ausente");
      if (indice === 0) {
        compradorId = cadastro.body.id;
        cookie = sessao;
      } else {
        outroCompradorId = cadastro.body.id;
        outroCookie = sessao;
      }
    }
    artesaoId = (
      await banco.prisma.usuario.create({
        data: {
          nome: "Artesao sintetico",
          email: `${randomUUID()}@teste.origem`,
          senhaHash: "hash-sintetico",
          papel: "artesao",
        },
      })
    ).id;
    categoriaId = (
      await banco.prisma.categoria.create({ data: { nome: "US20" } })
    ).id;
  },
  process.env.CI === "true" ? 120_000 : 40_000,
);

beforeEach(async () => {
  await banco.prisma.intencaoNotificacao.deleteMany();
  await banco.prisma.pagamento.deleteMany();
  await banco.prisma.itemPedido.deleteMany();
  await banco.prisma.pedido.deleteMany();
  await banco.prisma.itemCarrinho.deleteMany();
  await banco.prisma.produto.deleteMany();
});
afterAll(async () => {
  await banco?.fechar();
});

describe("US20 - checkout, pedido e pagamento em PostgreSQL real", () => {
  it("US20 - cenários 1 e 2: registra pagamento único e exibe o status no detalhe", async () => {
    const vaso = await produto();
    const cesta = await produto(5, "0.10");
    await carrinho(vaso.id, 2);
    await carrinho(cesta.id, 3);
    await carrinho(vaso.id, 1, outroCookie);
    await banco.prisma.produto.update({
      where: { id: vaso.id },
      data: { preco: "13.37", nome: "Vaso atualizado" },
    });

    const response = await confirmar([
      { produtoId: vaso.id, quantidade: 2 },
      { produtoId: cesta.id, quantidade: 3 },
    ]);
    expect(response.status).toBe(201);
    expect(response.body.pedido).toMatchObject({
      compradorId,
      status: "confirmado",
      total: 27.04,
      numero: expect.stringMatching(/^ORG-\d{4}-\d{6}$/),
    });
    const rows = await banco.prisma.$queryRaw<
      {
        status: string;
        total: string;
        numero: string;
        precoUnitario: string;
        subtotal: string;
        quantidade: number;
        valor: string;
        metodo: string;
        pagamentoStatus: string;
        intencaoStatus: string;
      }[]
    >`
      SELECT p."status"::text, p."total"::text, p."numero", i."precoUnitario"::text,
        i."subtotal"::text, i."quantidade", pg."valor"::text, pg."metodo"::text,
        pg."status"::text AS "pagamentoStatus", n."status"::text AS "intencaoStatus"
      FROM "Pedido" p JOIN "ItemPedido" i ON i."pedidoId" = p."id"
      JOIN "Pagamento" pg ON pg."pedidoId" = p."id"
      JOIN "IntencaoNotificacao" n ON n."pedidoId" = p."id"
      WHERE p."id" = ${response.body.pedido.id}::uuid ORDER BY i."subtotal" DESC
    `;
    expect(rows).toEqual([
      {
        status: "confirmado",
        total: "27.04",
        numero: response.body.pedido.numero,
        precoUnitario: "13.37",
        subtotal: "26.74",
        quantidade: 2,
        valor: "27.04",
        metodo: "pix_simulado",
        pagamentoStatus: "aprovado",
        intencaoStatus: "pendente",
      },
      {
        status: "confirmado",
        total: "27.04",
        numero: response.body.pedido.numero,
        precoUnitario: "0.10",
        subtotal: "0.30",
        quantidade: 3,
        valor: "27.04",
        metodo: "pix_simulado",
        pagamentoStatus: "aprovado",
        intencaoStatus: "pendente",
      },
    ]);
    expect(response.body.itens).toContainEqual({
      produtoId: vaso.id,
      nome: "Vaso atualizado",
      quantidade: 2,
      precoUnitario: 13.37,
      subtotal: 26.74,
    });
    const vendidos = await banco.prisma.$queryRaw<
      { quantidadeEstoque: number; quantidadeVendida: number }[]
    >`SELECT "quantidadeEstoque", "quantidadeVendida" FROM "Produto" WHERE "id" = ${vaso.id}::uuid`;
    expect(vendidos).toEqual([{ quantidadeEstoque: 18, quantidadeVendida: 2 }]);
    expect(
      await banco.prisma.itemCarrinho.count({
        where: { carrinhoId: compradorId },
      }),
    ).toBe(0);
    expect(
      await banco.prisma.itemCarrinho.count({
        where: { carrinhoId: outroCompradorId },
      }),
    ).toBe(1);
    const pagamentos = await banco.prisma.pagamento.findMany({
      where: { pedidoId: response.body.pedido.id },
    });
    expect(pagamentos).toHaveLength(1);
    const pagamento = pagamentos[0];
    if (!pagamento) throw new Error("Pagamento US20 ausente");
    expect(pagamento.metodo).toBe("pix_simulado");
    expect(pagamento.status).toBe("aprovado");
    expect(pagamento.valor.toNumber()).toBe(27.04);

    const detalhe = await request(app)
      .get(`/pedidos/${response.body.pedido.id}`)
      .set("Cookie", cookie);
    expect(detalhe.status).toBe(200);
    expect(detalhe.body.pedido).toMatchObject({
      id: response.body.pedido.id,
      compradorId,
      status: "confirmado",
      total: 27.04,
    });
    expect(detalhe.body.pagamento).toEqual({
      id: pagamento.id,
      metodo: "pix_simulado",
      status: "aprovado",
      valor: 27.04,
      dataPagamento: pagamento.dataPagamento.toISOString(),
    });
  });

  it("US20 - cenário 1: estoque insuficiente retorna 409 sem pedido ou pagamento", async () => {
    const vaso = await produto(5);
    const cesta = await produto(5);
    await carrinho(vaso.id, 2);
    await carrinho(cesta.id, 2);
    await banco.prisma.produto.update({
      where: { id: cesta.id },
      data: { quantidadeEstoque: 1 },
    });
    const antes = await banco.prisma.itemCarrinho.findMany({
      orderBy: { id: "asc" },
    });
    const response = await confirmar([
      { produtoId: vaso.id, quantidade: 2 },
      { produtoId: cesta.id, quantidade: 2 },
    ]);
    expect(response.status).toBe(409);
    expect(response.body.error.details).toEqual({
      produtoId: cesta.id,
      nome: cesta.nome,
    });
    expect(await banco.prisma.pedido.count()).toBe(0);
    expect(await banco.prisma.itemPedido.count()).toBe(0);
    expect(await banco.prisma.pagamento.count()).toBe(0);
    expect(await banco.prisma.intencaoNotificacao.count()).toBe(0);
    expect(
      await banco.prisma.itemCarrinho.findMany({ orderBy: { id: "asc" } }),
    ).toEqual(antes);
    expect(
      (await banco.prisma.produto.findUniqueOrThrow({ where: { id: vaso.id } }))
        .quantidadeEstoque,
    ).toBe(5);
  });

  it("US20 - cenário 2: outro comprador não visualiza o pagamento", async () => {
    const vaso = await produto();
    const criado = await confirmar([{ produtoId: vaso.id, quantidade: 1 }]);
    expect(criado.status).toBe(201);
    const pedidoId: string = criado.body.pedido.id;
    const pagamento = await banco.prisma.pagamento.findUniqueOrThrow({
      where: { pedidoId },
    });
    const proprio = await request(app)
      .get(`/pedidos/${pedidoId}`)
      .set("Cookie", cookie);
    expect(proprio.status).toBe(200);
    expect(proprio.body.pagamento.id).toBe(pagamento.id);

    const terceiro = await request(app)
      .get(`/pedidos/${pedidoId}`)
      .set("Cookie", outroCookie);
    const inexistente = await request(app)
      .get(`/pedidos/${randomUUID()}`)
      .set("Cookie", outroCookie);
    expect(terceiro.status).toBe(404);
    expect(inexistente.status).toBe(404);
    expect(terceiro.body).toEqual(inexistente.body);
    expect(terceiro.body).toEqual({
      error: {
        code: "PEDIDO_NAO_ENCONTRADO",
        message: "Pedido nao encontrado.",
      },
    });
    expect(terceiro.text).not.toContain(pagamento.id);
    expect(terceiro.text).not.toContain(pedidoId);
    expect(terceiro.body).not.toHaveProperty("pagamento");
  });
});

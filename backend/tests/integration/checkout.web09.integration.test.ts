import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

const TEMPO_NUMERACAO_MS = process.env.CI === "true" ? 60_000 : 20_000;

let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let app: ReturnType<typeof createApp>;
let cookie: string;
let outroCookie: string;
let artesaoId: string;
let categoriaId: string;

async function produto(estoque = 20, preco = "12.35") {
  return banco.prisma.produto.create({
    data: {
      nome: "Vaso sintetico WEB09",
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

beforeAll(async () => {
  banco = await criarBancoAuth();
  app = createApp(banco.prisma, {
    JWT_SECRET: "segredo-sintetico-exclusivo-checkout-web09",
    COOKIE_SECURE: false,
  });
  for (let indice = 0; indice < 2; indice += 1) {
    const email = `${randomUUID()}@teste.origem`;
    const senha = "SenhaSinteticaWEB09!";
    const cadastro = await request(app).post("/auth/register").send({
      nome: "Comprador sintetico WEB09",
      email,
      senha,
      papel: "comprador",
    });
    expect(cadastro.status).toBe(201);
    const login = await request(app).post("/auth/login").send({ email, senha });
    expect(login.status).toBe(200);
    const cookies: unknown = login.headers["set-cookie"];
    const sessao =
      Array.isArray(cookies) && typeof cookies[0] === "string"
        ? cookies[0].split(";")[0]
        : undefined;
    if (!sessao) throw new Error("Sessao de teste ausente");
    if (indice === 0) {
      cookie = sessao;
    } else {
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
    await banco.prisma.categoria.create({ data: { nome: "WEB09" } })
  ).id;
}, 30_000);

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

describe("WEB-09 checkout transacional real", () => {
  it(
    "gera dez numeros distintos e sequenciais pelo PostgreSQL",
    async () => {
      const vaso = await produto();
      const numeros: string[] = [];
      for (let indice = 0; indice < 10; indice += 1) {
        const response = await confirmar([
          { produtoId: vaso.id, quantidade: 1 },
        ]);
        expect(response.status).toBe(201);
        expect(response.body.pedido.numero).toMatch(/^ORG-\d{4}-\d{6}$/);
        numeros.push(response.body.pedido.numero);
      }
      expect(new Set(numeros).size).toBe(10);
      const primeiro = Number(numeros[0]?.slice(-6));
      expect(numeros.map((numero) => Number(numero.slice(-6)))).toEqual(
        Array.from({ length: 10 }, (_, indice) => primeiro + indice),
      );
      expect(
        await banco.prisma
          .$queryRaw`SELECT "sequencename" FROM pg_sequences WHERE "schemaname" = current_schema() AND "sequencename" = 'Pedido_numero_seq'`,
      ).toHaveLength(1);
    },
    TEMPO_NUMERACAO_MS,
  );

  it.each([1, 2, 3])(
    "preserva concorrencia entre compradores, rodada %i",
    async () => {
      const vaso = await produto(1);
      await carrinho(vaso.id);
      await carrinho(vaso.id, 1, outroCookie);
      const responses = await Promise.all(
        [cookie, outroCookie].map((sessao) =>
          confirmar([{ produtoId: vaso.id, quantidade: 1 }], sessao),
        ),
      );
      expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
      expect(await banco.prisma.pedido.count()).toBe(1);
      expect(await banco.prisma.pagamento.count()).toBe(1);
      const vencedor = responses.find(({ status }) => status === 201)?.body
        .pedido.compradorId;
      expect(
        await banco.prisma.itemCarrinho.count({
          where: { carrinhoId: vencedor },
        }),
      ).toBe(0);
      expect(await banco.prisma.itemCarrinho.count()).toBe(1);
      expect(
        (
          await banco.prisma.produto.findUniqueOrThrow({
            where: { id: vaso.id },
          })
        ).quantidadeEstoque,
      ).toBe(0);
    },
  );

  it.each(["Pagamento", "IntencaoNotificacao"] as const)(
    "rollback inclui baixas e carrinho quando %s falha",
    async (tabela) => {
      const vaso = await produto();
      await carrinho(vaso.id, 2);
      await banco.prisma.$executeRawUnsafe(
        `CREATE FUNCTION falhar_pagamento_web09() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Falha sintetica'; END; $$`,
      );
      await banco.prisma.$executeRawUnsafe(
        `CREATE TRIGGER falhar_pagamento_web09 BEFORE INSERT ON "${tabela}" FOR EACH ROW EXECUTE FUNCTION falhar_pagamento_web09()`,
      );
      try {
        const response = await confirmar([
          { produtoId: vaso.id, quantidade: 2 },
        ]);
        expect(response.status).toBe(503);
        expect(response.text).not.toContain("Falha sintetica");
        expect(await banco.prisma.pedido.count()).toBe(0);
        expect(await banco.prisma.itemPedido.count()).toBe(0);
        expect(await banco.prisma.pagamento.count()).toBe(0);
        expect(await banco.prisma.intencaoNotificacao.count()).toBe(0);
        expect(await banco.prisma.itemCarrinho.count()).toBe(1);
        expect(
          (
            await banco.prisma.produto.findUniqueOrThrow({
              where: { id: vaso.id },
            })
          ).quantidadeEstoque,
        ).toBe(20);
        expect(
          await banco.prisma
            .$queryRaw`SELECT "quantidadeVendida" FROM "Produto" WHERE "id" = ${vaso.id}::uuid`,
        ).toEqual([{ quantidadeVendida: 0 }]);
      } finally {
        await banco.prisma.$executeRawUnsafe(
          `DROP TRIGGER falhar_pagamento_web09 ON "${tabela}"`,
        );
        await banco.prisma.$executeRawUnsafe(
          "DROP FUNCTION falhar_pagamento_web09()",
        );
      }
    },
  );

  it.each([{ ativo: false }, { desativadoPorAdmin: true }])(
    "rejeita produto oculto: %j",
    async (alteracao) => {
      const vaso = await produto();
      await banco.prisma.produto.update({
        where: { id: vaso.id },
        data: alteracao,
      });
      const response = await confirmar([{ produtoId: vaso.id, quantidade: 1 }]);
      expect(response.status).toBe(404);
      expect(await banco.prisma.pedido.count()).toBe(0);
    },
  );

  it("rejeita total fora da capacidade monetaria sem gravacoes", async () => {
    const vaso = await produto(2, "99999999.99");
    const response = await confirmar([{ produtoId: vaso.id, quantidade: 2 }]);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDACAO");
    expect(await banco.prisma.pedido.count()).toBe(0);
    expect(
      (await banco.prisma.produto.findUniqueOrThrow({ where: { id: vaso.id } }))
        .quantidadeEstoque,
    ).toBe(2);
  });
});

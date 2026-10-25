import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let app: ReturnType<typeof createApp>;
const contas: Record<string, { id: string; cookie: string }> = {};
const itensA = Array.from({ length: 6 }, () => randomUUID());
const itemB = randomUUID();
const pendente = randomUUID();
const cancelado = randomUUID();
const pedidoId = randomUUID();

function conta(nome: string) {
  const registro = contas[nome];
  if (!registro) throw new Error("Conta Web.2 ausente");
  return registro;
}

function enviar(id: string, nome = "artesaoA") {
  return request(app)
    .patch(`/artesao/itens-pedido/${id}/enviar`)
    .set("Cookie", conta(nome).cookie);
}

beforeAll(async () => {
  banco = await criarBancoAuth();
  app = createApp(banco.prisma, {
    JWT_SECRET: "segredo-sintetico-web2-apenas-testes",
    COOKIE_SECURE: false,
  });
  for (const nome of ["comprador", "artesaoA", "artesaoB", "admin"]) {
    const email = `${randomUUID()}@teste.origem`;
    const senha = "SenhaSinteticaWeb2!";
    const cadastro = await request(app)
      .post("/auth/register")
      .send({
        nome,
        email,
        senha,
        papel: nome.startsWith("artesao") ? "artesao" : "comprador",
      });
    expect(cadastro.status).toBe(201);
    if (nome === "admin")
      await banco.prisma.usuario.update({
        where: { id: cadastro.body.id },
        data: { papel: "admin" },
      });
    const login = await request(app).post("/auth/login").send({ email, senha });
    expect(login.status).toBe(200);
    const cookie = login.headers["set-cookie"]?.[0]?.split(";")[0];
    if (!cookie) throw new Error("Sessao Web.2 ausente");
    contas[nome] = { id: cadastro.body.id, cookie };
  }
  const categoria = await banco.prisma.categoria.create({
    data: { nome: "Web.2" },
  });
  const produtos = [];
  for (const nome of ["artesaoA", "artesaoB"]) {
    produtos.push(
      await banco.prisma.produto.create({
        data: {
          nome: `Peca ${nome}`,
          descricao: "Sintetica Web.2",
          preco: 10,
          quantidadeEstoque: 0,
          ativo: false,
          artesaoId: conta(nome).id,
          categoriaId: categoria.id,
          tecnicaId: "tecnica-modelagem-argila",
        },
      }),
    );
  }
  const produtoA = produtos[0];
  const produtoB = produtos[1];
  if (!produtoA || !produtoB) throw new Error("Produtos Web.2 ausentes");
  for (const [id, status, ids] of [
    [pedidoId, "confirmado", [...itensA, itemB]],
    [randomUUID(), "pendente", [pendente]],
    [randomUUID(), "cancelado", [cancelado]],
  ] as const) {
    await banco.prisma.pedido.create({
      data: {
        id,
        status,
        compradorId: conta("comprador").id,
        total: ids.length * 10,
        itens: {
          create: ids.map((itemId) => ({
            id: itemId,
            produtoId: itemId === itemB ? produtoB.id : produtoA.id,
            quantidade: 1,
            precoUnitario: 10,
            subtotal: 10,
          })),
        },
      },
    });
  }
}, 60_000);

afterAll(async () => {
  await banco?.fechar();
});

describe("Web.2 envio de item em PostgreSQL real", () => {
  it("expoe id e estado inicial dos proprios itens", async () => {
    const lista = await request(app)
      .get("/artesao/pedidos")
      .set("Cookie", conta("artesaoA").cookie);
    expect(lista.status).toBe(200);
    expect(lista.body.itens[0].itens).toHaveLength(6);
    for (const item of lista.body.itens[0].itens)
      expect(item).toMatchObject({
        id: expect.any(String),
        status: "aguardando_envio",
        enviadoEm: null,
      });
    expect(lista.text).not.toContain(itemB);
  });

  it("nao revela item alheio nem permite seu envio", async () => {
    for (const id of [itemB, randomUUID()]) {
      const resposta = await enviar(id);
      expect(resposta.status).toBe(404);
      expect(resposta.body.error.code).toBe("ITEM_PEDIDO_NAO_ENCONTRADO");
    }
  });

  it.each([pendente, cancelado])(
    "recusa pedido nao confirmado: %s",
    async (id) => {
      const resposta = await enviar(id);
      expect(resposta.status).toBe(409);
      expect(resposta.body.error.code).toBe("PEDIDO_NAO_CONFIRMADO");
    },
  );

  it("envia cinco itens e atualiza comprador com a mesma sessao", async () => {
    for (const id of itensA.slice(0, 5)) {
      const inicio = Date.now();
      const resposta = await enviar(id);
      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({
        id,
        status: "enviado",
        enviadoEm: expect.any(String),
      });
      expect(Date.parse(resposta.body.enviadoEm)).toBeGreaterThanOrEqual(
        inicio,
      );
      const repeticao = await enviar(id);
      expect(repeticao.status).toBe(409);
      expect(repeticao.body.error.code).toBe("ITEM_JA_ENVIADO");
      const registro = await banco.prisma.itemPedido.findUniqueOrThrow({
        where: { id },
      });
      expect(registro).toMatchObject({
        status: "enviado",
        enviadoEm: new Date(resposta.body.enviadoEm),
      });
    }
    const detalhe = await request(app)
      .get(`/pedidos/${pedidoId}`)
      .set("Cookie", conta("comprador").cookie);
    expect(detalhe.status).toBe(200);
    expect(detalhe.headers["cache-control"]).toBe("no-store");
    expect(
      detalhe.body.itens.filter(
        (item: { status: string }) => item.status === "enviado",
      ),
    ).toHaveLength(5);
    expect(
      detalhe.body.itens.find((item: { id: string }) => item.id === itemB),
    ).toMatchObject({ status: "aguardando_envio", enviadoEm: null });
  });

  it("serializa envios concorrentes com um unico sucesso", async () => {
    const id = itensA[5];
    if (!id) throw new Error("Item concorrente ausente");
    const respostas = await Promise.all(
      Array.from({ length: 4 }, () => enviar(id)),
    );
    expect(respostas.map((r) => r.status).sort()).toEqual([200, 409, 409, 409]);
    const sucesso = respostas.find((r) => r.status === 200);
    expect(
      await banco.prisma.itemPedido.findUniqueOrThrow({ where: { id } }),
    ).toMatchObject({ enviadoEm: new Date(sucesso?.body.enviadoEm) });
  });

  it("exige sessao e papel artesao", async () => {
    const path = `/artesao/itens-pedido/${itemB}/enviar`;
    expect((await request(app).patch(path)).status).toBe(401);
    for (const nome of ["comprador", "admin"])
      expect((await enviar(itemB, nome)).status).toBe(403);
  });

  it("valida identificador, corpo e query antes da mutacao", async () => {
    for (const chamada of [
      enviar("invalido"),
      enviar(itemB).send({ artesaoId: conta("artesaoB").id }),
      enviar(itemB).query({ status: "enviado" }),
    ]) {
      const resposta = await chamada;
      expect(resposta.status).toBe(400);
      expect(resposta.text).not.toMatch(/Prisma|SELECT|stack/);
    }
  });
});

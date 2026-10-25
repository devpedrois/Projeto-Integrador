import { randomUUID } from "node:crypto";
import { setTimeout as esperar } from "node:timers/promises";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { notificarArtesao } from "../../src/jobs/notificar-artesao.handler.js";
import { PrismaIntencaoNotificacaoRepository } from "../../src/repositories/intencao-notificacao.repository.js";
import { PrismaNotificacaoRepository } from "../../src/repositories/notificacao.repository.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

const secret = "segredo-sintetico-exclusivo-web14-testes";
let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let app: ReturnType<typeof createApp>;
let artesao: string;
let outro: string;
let comprador: string;
let admin: string;
let produtos: string[];
let data: { intencaoId: string; pedidoId: string };

function cookie(id: string) {
  return `origem_sessao=${jwt.sign({ papel: "artesao", nome: "Sintetico" }, secret, { subject: id, expiresIn: "1h" })}`;
}
async function processar() {
  await notificarArtesao(
    new PrismaIntencaoNotificacaoRepository(banco.prisma),
    data,
    new PrismaNotificacaoRepository(banco.prisma),
  );
}
beforeAll(async () => {
  banco = await criarBancoAuth();
  app = createApp(banco.prisma, { JWT_SECRET: secret, COOKIE_SECURE: false });
  const ids: string[] = [];
  for (const papel of ["artesao", "artesao", "comprador", "admin"] as const) {
    const usuario = await banco.prisma.usuario.create({
      data: {
        nome: "Sintetico WEB14",
        email: `${randomUUID()}@teste.origem`,
        senhaHash: "hash-sintetico",
        papel,
      },
    });
    ids.push(usuario.id);
  }
  [artesao, outro, comprador, admin] = ids as [string, string, string, string];
  const categoria = await banco.prisma.categoria.create({
    data: { nome: "WEB14" },
  });
  produtos = [];
  for (const artesaoId of [artesao, artesao, outro]) {
    const produto = await banco.prisma.produto.create({
      data: {
        nome: "Peca sintetica",
        descricao: "WEB14",
        preco: 10,
        quantidadeEstoque: 10,
        artesaoId,
        categoriaId: categoria.id,
        tecnicaId: "tecnica-modelagem-argila",
      },
    });
    produtos.push(produto.id);
  }
}, 30_000);
beforeEach(async () => {
  const pedido = await banco.prisma.pedido.create({
    data: {
      compradorId: comprador,
      itens: {
        create: produtos.map((produtoId) => ({ produtoId, quantidade: 1 })),
      },
      intencaoNotificacao: { create: {} },
    },
    include: { intencaoNotificacao: true },
  });
  if (!pedido.intencaoNotificacao)
    throw new Error("Intencao ausente no fixture WEB14");
  data = { pedidoId: pedido.id, intencaoId: pedido.intencaoNotificacao.id };
});
afterAll(async () => {
  await banco?.fechar();
});

describe("WEB-14 notificacoes", () => {
  it("30.5 aguarda a latencia antes de gravar sem alterar a idempotencia", async () => {
    const inicio = performance.now();
    const processamento = notificarArtesao(
      new PrismaIntencaoNotificacaoRepository(banco.prisma),
      data,
      new PrismaNotificacaoRepository(banco.prisma),
      800,
    );
    await esperar(100);
    const durante = await banco.prisma.notificacao.count({
      where: { pedidoId: data.pedidoId },
    });
    await processamento;
    expect(durante).toBe(0);
    expect(performance.now() - inicio).toBeGreaterThanOrEqual(800);
    const antes = await banco.prisma.notificacao.findMany({
      where: { pedidoId: data.pedidoId },
      orderBy: { id: "asc" },
    });
    const intencaoAntes =
      await banco.prisma.intencaoNotificacao.findUniqueOrThrow({
        where: { id: data.intencaoId },
      });
    await notificarArtesao(
      new PrismaIntencaoNotificacaoRepository(banco.prisma),
      data,
      new PrismaNotificacaoRepository(banco.prisma),
      20,
    );
    expect(
      await banco.prisma.notificacao.findMany({
        where: { pedidoId: data.pedidoId },
        orderBy: { id: "asc" },
      }),
    ).toEqual(antes);
    expect(
      await banco.prisma.intencaoNotificacao.findUniqueOrThrow({
        where: { id: data.intencaoId },
      }),
    ).toEqual(intencaoAntes);
  });
  it("grava um aviso por artesao distinto antes de processar", async () => {
    await processar();
    const avisos = await banco.prisma.notificacao.findMany({
      where: { pedidoId: data.pedidoId },
    });
    expect(avisos.map((n) => n.usuarioId).sort()).toEqual(
      [artesao, outro].sort(),
    );
    expect(avisos.every((n) => !n.lida && n.tipo === "novo_pedido")).toBe(true);
    expect(
      await banco.prisma.intencaoNotificacao.findUnique({
        where: { id: data.intencaoId },
      }),
    ).toMatchObject({ status: "processada", processadaEm: expect.any(Date) });
  });
  it("redelivery concorrente preserva leitura, id e timestamp", async () => {
    await processar();
    const original = await banco.prisma.notificacao.findFirstOrThrow({
      where: { pedidoId: data.pedidoId, usuarioId: artesao },
    });
    await banco.prisma.notificacao.update({
      where: { id: original.id },
      data: { lida: true },
    });
    const intencao = await banco.prisma.intencaoNotificacao.findUniqueOrThrow({
      where: { id: data.intencaoId },
    });
    await Promise.all([processar(), processar()]);
    expect(
      await banco.prisma.notificacao.count({
        where: { pedidoId: data.pedidoId },
      }),
    ).toBe(2);
    expect(
      await banco.prisma.notificacao.findUnique({ where: { id: original.id } }),
    ).toMatchObject({ lida: true, criadoEm: original.criadoEm });
    expect(
      (
        await banco.prisma.intencaoNotificacao.findUniqueOrThrow({
          where: { id: data.intencaoId },
        })
      ).processadaEm,
    ).toEqual(intencao.processadaEm);
  });
  it("falha parcial deixa intencao pendente e retry completa sem duplicar", async () => {
    await banco.prisma
      .$executeRawUnsafe(`CREATE FUNCTION falhar_notificacao_web14() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF EXISTS (SELECT 1 FROM "Notificacao" WHERE "pedidoId" = NEW."pedidoId") THEN
          RAISE EXCEPTION 'Falha sintetica WEB14';
        END IF;
        RETURN NEW;
      END; $$`);
    await banco.prisma.$executeRawUnsafe(
      `CREATE TRIGGER falhar_notificacao_web14 BEFORE INSERT ON "Notificacao" FOR EACH ROW EXECUTE FUNCTION falhar_notificacao_web14()`,
    );
    try {
      await expect(processar()).rejects.toThrow();
      expect(
        await banco.prisma.notificacao.count({
          where: { pedidoId: data.pedidoId },
        }),
      ).toBe(1);
      expect(
        await banco.prisma.intencaoNotificacao.findUnique({
          where: { id: data.intencaoId },
        }),
      ).toMatchObject({ status: "pendente", processadaEm: null });
    } finally {
      await banco.prisma.$executeRawUnsafe(
        'DROP TRIGGER falhar_notificacao_web14 ON "Notificacao"',
      );
    }
    await processar();
    expect(
      await banco.prisma.notificacao.count({
        where: { pedidoId: data.pedidoId },
      }),
    ).toBe(2);
  });
  it("lista somente token com nao lidas primeiro e data decrescente", async () => {
    const datas = ["2026-01-01", "2026-01-03", "2026-01-02"];
    const ids: string[] = [];
    for (const [index, criadoEm] of datas.entries()) {
      const pedido = await banco.prisma.pedido.create({
        data: { compradorId: comprador },
      });
      const n = await banco.prisma.notificacao.create({
        data: {
          usuarioId: artesao,
          pedidoId: pedido.id,
          tipo: "novo_pedido",
          lida: index === 1,
          criadoEm: new Date(criadoEm),
        },
      });
      ids.push(n.id);
    }
    const externo = await banco.prisma.notificacao.create({
      data: { usuarioId: outro, pedidoId: data.pedidoId, tipo: "novo_pedido" },
    });
    const response = await request(app)
      .get(`/artesao/notificacoes?usuarioId=${outro}`)
      .set("Cookie", cookie(artesao));
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    const encontrados = response.body as { id: string; lida: boolean }[];
    expect(encontrados.some((n) => n.id === externo.id)).toBe(false);
    const selecionados = encontrados.filter((n) => ids.includes(n.id));
    expect(selecionados.map((n) => n.id)).toEqual([ids[2], ids[0], ids[1]]);
    expect(response.body[0]).toMatchObject({
      pedidoId: expect.any(String),
      tipo: "novo_pedido",
      criadoEm: expect.any(String),
    });
    expect(response.body[0]).not.toHaveProperty("usuarioId");
  });
  it("marca somente propria e retorna 404 indistinguivel para outra", async () => {
    const aviso = await banco.prisma.notificacao.create({
      data: {
        usuarioId: artesao,
        pedidoId: data.pedidoId,
        tipo: "novo_pedido",
      },
    });
    const rota = `/artesao/notificacoes/${aviso.id}/lida`;
    const externa = await request(app).patch(rota).set("Cookie", cookie(outro));
    const ausente = await request(app)
      .patch(`/artesao/notificacoes/${randomUUID()}/lida`)
      .set("Cookie", cookie(outro));
    expect(externa.status).toBe(404);
    expect(externa.body).toEqual(ausente.body);
    expect(
      (
        await banco.prisma.notificacao.findUniqueOrThrow({
          where: { id: aviso.id },
        })
      ).lida,
    ).toBe(false);
    for (let i = 0; i < 2; i++)
      expect(
        (await request(app).patch(rota).set("Cookie", cookie(artesao))).status,
      ).toBe(204);
    expect(
      (
        await banco.prisma.notificacao.findUniqueOrThrow({
          where: { id: aviso.id },
        })
      ).lida,
    ).toBe(true);
    expect(
      (
        await request(app)
          .patch("/artesao/notificacoes/invalido/lida")
          .set("Cookie", cookie(artesao))
      ).status,
    ).toBe(400);
  });
  it.each(["get", "patch"] as const)(
    "protege rota %s por sessao e papel",
    async (metodo) => {
      const rota =
        metodo === "get"
          ? "/artesao/notificacoes"
          : `/artesao/notificacoes/${randomUUID()}/lida`;
      expect((await request(app)[metodo](rota)).status).toBe(401);
      for (const id of [comprador, admin])
        expect(
          (await request(app)[metodo](rota).set("Cookie", cookie(id))).status,
        ).toBe(403);
    },
  );
});

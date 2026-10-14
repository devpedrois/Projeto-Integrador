import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { gerarHash } from "../../src/utils/senha.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

const secret = "segredo-sintetico-exclusivo-testes-web12";
let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let app: ReturnType<typeof createApp>;
let dono: string;
let outro: string;
let admin: string;
let comprador: string;
let categoriaId: string;
let produtoId: string;
const email = `${randomUUID()}@teste.origem`;
const senha = "SenhaSinteticaWEB12!";
function cookie(id: string) {
  return `origem_sessao=${jwt.sign({ papel: "artesao", nome: "Sintetico" }, secret, { subject: id, expiresIn: "1h" })}`;
}
function input() {
  return {
    nome: "Vaso WEB12",
    descricao: "Peca sintetica",
    preco: 25.5,
    categoriaId,
    fotos: [{ url: "https://example.test/vaso.jpg" }],
    quantidadeEstoque: 5,
  };
}
beforeAll(async () => {
  banco = await criarBancoAuth();
  app = createApp(banco.prisma, { JWT_SECRET: secret, COOKIE_SECURE: false });
  for (const papel of ["artesao", "artesao", "admin", "comprador"] as const) {
    const usuario = await banco.prisma.usuario.create({
      data: {
        nome: "Sintetico WEB12",
        email: dono ? `${randomUUID()}@teste.origem` : email,
        senhaHash: await gerarHash(senha),
        papel,
        ...(papel === "artesao"
          ? {
              perfilArtesao: {
                create: { tecnicaPrincipalId: "tecnica-modelagem-argila" },
              },
            }
          : {}),
      },
    });
    if (!dono) dono = usuario.id;
    else if (!outro) outro = usuario.id;
    else if (!admin) admin = usuario.id;
    else comprador = usuario.id;
  }
  categoriaId = (
    await banco.prisma.categoria.create({ data: { nome: "WEB12" } })
  ).id;
}, 30_000);
beforeEach(async () => {
  await banco.prisma.usuario.update({
    where: { id: dono },
    data: { ativo: true },
  });
  produtoId = (
    await banco.prisma.produto.create({
      data: {
        nome: "Vaso WEB12",
        descricao: "Sintetica",
        preco: 25.5,
        quantidadeEstoque: 5,
        artesaoId: dono,
        categoriaId,
        tecnicaId: "tecnica-modelagem-argila",
      },
    })
  ).id;
});
afterAll(async () => {
  await banco?.fechar();
});

describe("WEB-12 catalogo e moderacao", () => {
  it.each(["PATCH", "DELETE", "ESTOQUE"] as const)(
    "matriz de propriedade %s",
    async (acao) => {
      for (const [id, status] of [
        [dono, 200],
        [outro, 403],
        [admin, 200],
        [null, 401],
        [comprador, 403],
      ] as const) {
        const req =
          acao === "DELETE"
            ? request(app).delete(`/produtos/${produtoId}`)
            : request(app).patch(
                `/produtos/${produtoId}${acao === "ESTOQUE" ? "/estoque" : ""}`,
              );
        if (id) req.set("Cookie", cookie(id));
        const response = await req.send(
          acao === "DELETE"
            ? undefined
            : acao === "ESTOQUE"
              ? { quantidadeEstoque: 7 }
              : { nome: "Editado" },
        );
        expect(response.status).toBe(status);
      }
      const registro = await banco.prisma.produto.findUniqueOrThrow({
        where: { id: produtoId },
      });
      expect(registro.artesaoId).toBe(dono);
      if (acao === "DELETE") expect(registro.ativo).toBe(false);
    },
  );
  it("cria pelo token, valida referencias e rejeita identidade externa", async () => {
    const response = await request(app)
      .post("/produtos")
      .set("Cookie", cookie(dono))
      .send(input());
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      artesaoId: dono,
      tecnicaId: "tecnica-modelagem-argila",
      preco: 25.5,
      fotos: [{ url: "https://example.test/vaso.jpg", ordem: 0 }],
    });
    expect((await request(app).post("/produtos").send(input())).status).toBe(
      401,
    );
    for (const id of [comprador, admin])
      expect(
        (
          await request(app)
            .post("/produtos")
            .set("Cookie", cookie(id))
            .send(input())
        ).status,
      ).toBe(403);
    expect(
      (
        await request(app)
          .post("/produtos")
          .set("Cookie", cookie(dono))
          .send({ ...input(), artesaoId: outro })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post("/produtos")
          .set("Cookie", cookie(dono))
          .send({ ...input(), categoriaId: randomUUID() })
      ).status,
    ).toBe(400);
  });
  it("lista todos os produtos proprios incluindo inativos e sem estoque", async () => {
    await banco.prisma.produto.update({
      where: { id: produtoId },
      data: { ativo: false, quantidadeEstoque: 0 },
    });
    const response = await request(app)
      .get("/artesao/produtos")
      .set("Cookie", cookie(dono));
    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: produtoId,
          ativo: false,
          quantidadeEstoque: 0,
        }),
      ]),
    );
    expect(
      response.body.every((p: { artesaoId: string }) => p.artesaoId === dono),
    ).toBe(true);
    const terceiro = await request(app)
      .get("/artesao/produtos")
      .set("Cookie", cookie(outro));
    expect(terceiro.body).toEqual([]);
    expect((await request(app).get("/artesao/produtos")).status).toBe(401);
    expect(
      (
        await request(app)
          .get("/artesao/produtos")
          .set("Cookie", cookie(comprador))
      ).status,
    ).toBe(403);
  });
  it("protege todas as rotas admin antes de validar entradas", async () => {
    for (const id of [comprador, outro, null]) {
      for (const [metodo, path] of [
        ["get", "/admin/artesaos"],
        ["get", "/admin/produtos"],
        ["patch", `/admin/artesaos/${dono}/moderar`],
        ["patch", `/admin/produtos/${produtoId}/moderar`],
        ["patch", `/admin/usuarios/${dono}/papel`],
        ["get", "/admin/desconhecida"],
      ] as const) {
        const req = request(app)[metodo](path);
        if (id) req.set("Cookie", cookie(id));
        expect((await req.send({ ativo: false })).status).toBe(id ? 403 : 401);
      }
    }
  });
  it("modera artesao reversivelmente e invalida login e sessao", async () => {
    const route = `/admin/artesaos/${dono}/moderar`;
    expect(
      (
        await request(app)
          .patch(route)
          .set("Cookie", cookie(admin))
          .send({ ativo: false })
      ).status,
    ).toBe(200);
    expect((await request(app).get(`/produtos/${produtoId}`)).status).toBe(404);
    expect(
      (await request(app).get("/artesao/produtos").set("Cookie", cookie(dono)))
        .status,
    ).toBe(401);
    expect(
      (await request(app).post("/auth/login").send({ email, senha })).status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .patch(route)
          .set("Cookie", cookie(admin))
          .send({ ativo: true })
      ).status,
    ).toBe(200);
    expect((await request(app).get(`/produtos/${produtoId}`)).status).toBe(200);
    expect(
      (await request(app).post("/auth/login").send({ email, senha })).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .patch(`/admin/artesaos/${admin.toUpperCase()}/moderar`)
          .set("Cookie", cookie(admin))
          .send({ ativo: false })
      ).status,
    ).toBe(403);
  });
  it("moderacao preserva soft delete e dono nao reativa produto moderado", async () => {
    const route = `/admin/produtos/${produtoId}/moderar`;
    expect(
      (
        await request(app)
          .patch(route)
          .set("Cookie", cookie(admin))
          .send({ ativo: false })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .patch(`/produtos/${produtoId}`)
          .set("Cookie", cookie(dono))
          .send({ ativo: true })
      ).status,
    ).toBe(403);
    expect((await request(app).get(`/produtos/${produtoId}`)).status).toBe(404);
    expect(
      (
        await request(app)
          .patch(route)
          .set("Cookie", cookie(admin))
          .send({ ativo: true })
      ).status,
    ).toBe(200);
    expect((await request(app).get(`/produtos/${produtoId}`)).status).toBe(200);
    await request(app)
      .delete(`/produtos/${produtoId}`)
      .set("Cookie", cookie(dono));
    await request(app)
      .patch(route)
      .set("Cookie", cookie(admin))
      .send({ ativo: true });
    expect(
      (
        await banco.prisma.produto.findUniqueOrThrow({
          where: { id: produtoId },
        })
      ).ativo,
    ).toBe(false);
  });
  it.each([
    { quantidadeEstoque: -1 },
    { quantidadeEstoque: 1.5 },
    { quantidadeEstoque: 2147483648 },
    { quantidadeEstoque: "3" },
    { quantidadeEstoque: 2, artesaoId: "externo" },
  ])("rejeita estoque invalido %j", async (body) => {
    expect(
      (
        await request(app)
          .patch(`/produtos/${produtoId}/estoque`)
          .set("Cookie", cookie(dono))
          .send(body)
      ).status,
    ).toBe(400);
    expect(
      (
        await banco.prisma.produto.findUniqueOrThrow({
          where: { id: produtoId },
        })
      ).quantidadeEstoque,
    ).toBe(5);
  });
  it("listas administrativas incluem inativos sem dados secretos", async () => {
    for (const path of ["/admin/artesaos", "/admin/produtos"]) {
      const response = await request(app)
        .get(path)
        .set("Cookie", cookie(admin));
      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
      expect(JSON.stringify(response.body)).not.toMatch(/senha|Hash/);
    }
  });
  it.each([
    { nome: "" },
    { preco: 0 },
    { preco: 1.234 },
    { categoriaId: "invalido" },
    { fotos: [{ url: "javascript:alert(1)" }] },
    { fotos: [] },
    { desativadoPorAdmin: false },
    { artesaoId: "externo" },
    {},
  ])("PATCH rejeita entrada invalida %j sem alterar produto", async (body) => {
    expect(
      (
        await request(app)
          .patch(`/produtos/${produtoId}`)
          .set("Cookie", cookie(dono))
          .send(body)
      ).status,
    ).toBe(400);
    expect(
      (
        await banco.prisma.produto.findUniqueOrThrow({
          where: { id: produtoId },
        })
      ).nome,
    ).toBe("Vaso WEB12");
  });
  it("soft delete preserva itens de pedidos anteriores", async () => {
    const pedido = await request(app)
      .post("/pedidos")
      .set("Cookie", cookie(comprador))
      .send({ itens: [{ produtoId, quantidade: 2 }] });
    expect(pedido.status).toBe(201);
    expect(
      (
        await request(app)
          .delete(`/produtos/${produtoId}`)
          .set("Cookie", cookie(dono))
      ).status,
    ).toBe(200);
    const item = await banco.prisma.itemPedido.findFirstOrThrow({
      where: { produtoId },
    });
    expect(item.quantidade).toBe(2);
    expect(item.precoUnitario?.toNumber()).toBe(25.5);
    expect(
      (
        await banco.prisma.produto.findUniqueOrThrow({
          where: { id: produtoId },
        })
      ).ativo,
    ).toBe(false);
  });
  it("checkout simultaneo com estoque manual preserva ordem dos commits", async () => {
    const [estoque, pedido] = await Promise.all([
      request(app)
        .patch(`/produtos/${produtoId}/estoque`)
        .set("Cookie", cookie(dono))
        .send({ quantidadeEstoque: 8 }),
      request(app)
        .post("/pedidos")
        .set("Cookie", cookie(comprador))
        .send({ itens: [{ produtoId, quantidade: 2 }] }),
    ]);
    expect(estoque.status).toBe(200);
    expect(pedido.status).toBe(201);
    const atual = await banco.prisma.produto.findUniqueOrThrow({
      where: { id: produtoId },
    });
    expect([6, 8]).toContain(atual.quantidadeEstoque);
    expect(atual.quantidadeVendida).toBe(2);
  });
  it("revalida bloqueio administrativo depois de esperar o lock do produto", async () => {
    let pendente: Promise<{ status: number }> | undefined;
    await banco.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Produto" WHERE "id" = ${produtoId}::uuid FOR UPDATE`;
        pendente = request(app)
          .patch(`/produtos/${produtoId}`)
          .set("Cookie", cookie(dono))
          .send({ ativo: true })
          .then((response) => response);
        let bloqueado = false;
        const prazo = Date.now() + 5000;
        while (!bloqueado && Date.now() < prazo) {
          const rows = await tx.$queryRaw<{ bloqueado: boolean }[]>`
          SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE pg_backend_pid() = ANY(pg_blocking_pids(pid))) AS bloqueado`;
          bloqueado = rows[0]?.bloqueado ?? false;
          if (!bloqueado)
            await new Promise((resolve) => setTimeout(resolve, 20));
        }
        expect(bloqueado).toBe(true);
        await tx.produto.update({
          where: { id: produtoId },
          data: { desativadoPorAdmin: true },
        });
      },
      { timeout: 10000 },
    );
    expect((await pendente)?.status).toBe(403);
    expect(
      (
        await banco.prisma.produto.findUniqueOrThrow({
          where: { id: produtoId },
        })
      ).desativadoPorAdmin,
    ).toBe(true);
  }, 15000);
});

import "dotenv/config";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { createPrismaClient } from "../../src/database/prisma/client.js";
import type { PapelUsuario } from "../../src/generated/prisma/enums.js";
import { gerarHash } from "../../src/utils/senha.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error("DATABASE_URL is required for integration tests");
const prisma = createPrismaClient(databaseUrl);
const secret = "segredo-sintetico-exclusivo-testes-web04";
const app = createApp(prisma, { JWT_SECRET: secret, COOKIE_SECURE: false });
const senha = "SenhaSinteticaWEB04!";
type Ator = { id: string; email: string; cookie: string };
const atores: Partial<Record<PapelUsuario, Ator>> = {};
const usuarioIds: string[] = [];
const produtoIds: string[] = [];
let senhaHash: string;
let categoriaId: string;

function ator(papel: PapelUsuario): Ator {
  const usuario = atores[papel];
  if (!usuario) throw new Error("Ator de teste nao preparado");
  return usuario;
}

async function novoUsuario(papel: PapelUsuario): Promise<Ator> {
  const usuario = await prisma.usuario.create({
    data: {
      nome: "Usuario sintetico WEB04",
      email: `web04-${randomUUID()}@teste.origem`,
      senhaHash,
      papel,
    },
  });
  usuarioIds.push(usuario.id);
  const login = await request(app)
    .post("/auth/login")
    .send({ email: usuario.email, senha });
  expect(login.status).toBe(200);
  const cookies = login.headers["set-cookie"] as string[] | undefined;
  const cookie = cookies?.[0]?.split(";")[0];
  if (!cookie) throw new Error("Login nao emitiu cookie");
  return { id: usuario.id, email: usuario.email, cookie };
}

async function novoProduto(estoque = 5): Promise<string> {
  const produto = await prisma.produto.create({
    data: {
      nome: "Produto sintetico WEB04",
      descricao: "Descricao de teste",
      preco: "10.00",
      artesaoId: ator("artesao").id,
      categoriaId,
      tecnicaId: "tecnica-modelagem-argila",
      quantidadeEstoque: estoque,
    },
  });
  produtoIds.push(produto.id);
  return produto.id;
}

beforeAll(async () => {
  senhaHash = await gerarHash(senha);
  for (const papel of ["comprador", "artesao", "admin"] as const)
    atores[papel] = await novoUsuario(papel);
  const categoria = await prisma.categoria.create({
    data: { nome: `Categoria WEB04 ${randomUUID()}` },
  });
  categoriaId = categoria.id;
}, 20_000);

afterEach(async () => {
  const pedidos = await prisma.pedido.findMany({
    where: { compradorId: { in: usuarioIds } },
    select: { id: true },
  });
  const pedidoIds = pedidos.map(({ id }) => id);
  await prisma.intencaoNotificacao.deleteMany({
    where: { pedidoId: { in: pedidoIds } },
  });
  await prisma.itemPedido.deleteMany({
    where: { pedidoId: { in: pedidoIds } },
  });
  await prisma.pagamento.deleteMany({ where: { pedidoId: { in: pedidoIds } } });
  await prisma.pedido.deleteMany({ where: { id: { in: pedidoIds } } });
  await prisma.produto.deleteMany({ where: { id: { in: produtoIds } } });
  produtoIds.length = 0;
  for (const papel of ["comprador", "artesao", "admin"] as const) {
    await prisma.usuario.update({
      where: { id: ator(papel).id },
      data: { papel, ativo: true },
    });
  }
});

afterAll(async () => {
  await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } });
  if (categoriaId)
    await prisma.categoria.delete({ where: { id: categoriaId } });
  await prisma.$disconnect();
});

const matriz = [
  { papel: "anonimo", pedidoStatus: 401, adminStatus: 401 },
  { papel: "comprador", pedidoStatus: 201, adminStatus: 403 },
  { papel: "artesao", pedidoStatus: 403, adminStatus: 403 },
  { papel: "admin", pedidoStatus: 403, adminStatus: 200 },
] as const;

describe("WEB-04: matriz de autorizacao", () => {
  it.each(matriz)(
    "POST /pedidos como $papel retorna $pedidoStatus",
    async ({ papel, pedidoStatus }) => {
      const produtoId = await novoProduto();
      const chamada = request(app).post("/pedidos");
      if (papel !== "anonimo") chamada.set("Cookie", ator(papel).cookie);
      const response = await chamada.send({
        itens: [{ produtoId, quantidade: 1 }],
      });
      expect(response.status).toBe(pedidoStatus);
      const produto = await prisma.produto.findUniqueOrThrow({
        where: { id: produtoId },
      });
      expect(produto.quantidadeEstoque).toBe(pedidoStatus === 201 ? 4 : 5);
      const pedidos = await prisma.pedido.findMany({
        where: { compradorId: { in: usuarioIds } },
      });
      expect(pedidos).toHaveLength(pedidoStatus === 201 ? 1 : 0);
      if (pedidoStatus === 201) {
        expect(pedidos[0]?.compradorId).toBe(ator("comprador").id);
        expect(pedidos[0]?.compradorRef).toBeNull();
      }
    },
  );

  it.each(matriz)(
    "PATCH /admin/usuarios/:id/papel como $papel retorna $adminStatus",
    async ({ papel, adminStatus }) => {
      const alvo = await novoUsuario("comprador");
      const chamada = request(app).patch(`/admin/usuarios/${alvo.id}/papel`);
      if (papel !== "anonimo") chamada.set("Cookie", ator(papel).cookie);
      const response = await chamada.send({ papel: "artesao" });
      expect(response.status).toBe(adminStatus);
      const salvo = await prisma.usuario.findUniqueOrThrow({
        where: { id: alvo.id },
      });
      expect(salvo.papel).toBe(adminStatus === 200 ? "artesao" : "comprador");
      if (adminStatus === 200) {
        expect(response.body).toEqual({
          id: alvo.id,
          nome: salvo.nome,
          email: alvo.email,
          papel: "artesao",
        });
        expect(response.text).not.toContain("senhaHash");
      }
    },
  );
});

describe("WEB-04: sessao protegida", () => {
  const rotas = ["pedido", "admin"] as const;
  function chamadaProtegida(rota: (typeof rotas)[number], cookie: string) {
    return rota === "pedido"
      ? request(app)
          .post("/pedidos")
          .set("Cookie", cookie)
          .send({ itens: [{ produtoId: randomUUID(), quantidade: 1 }] })
      : request(app)
          .patch(`/admin/usuarios/${ator("comprador").id}/papel`)
          .set("Cookie", cookie)
          .send({ papel: "artesao" });
  }

  it.each(rotas)("rejeita JWT invalido ou expirado em %s", async (rota) => {
    const claims = {
      sub: ator("comprador").id,
      papel: "comprador",
      nome: "Usuario sintetico",
    };
    const tokens = [
      "invalido",
      "%E0%A4%A",
      "j:%7B%22papel%22%3A%22admin%22%7D",
      jwt.sign(claims, secret, { expiresIn: -1 }),
      jwt.sign(claims, "outro-segredo-sintetico-para-testes", {
        expiresIn: "24h",
      }),
      jwt.sign(claims, secret, { algorithm: "HS384", expiresIn: "24h" }),
      jwt.sign({ ...claims, sub: randomUUID() }, secret, { expiresIn: "24h" }),
      jwt.sign({ ...claims, sub: "nao-e-uuid" }, secret, { expiresIn: "24h" }),
    ];
    for (const token of tokens) {
      const response = await chamadaProtegida(rota, `origem_sessao=${token}`);
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("NAO_AUTENTICADO");
      expect(response.text).not.toContain("senhaHash");
    }
  });

  it.each(rotas)(
    "nega sessao desativada depois do login em %s",
    async (rota) => {
      const usuario = ator(rota === "pedido" ? "comprador" : "admin");
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { ativo: false },
      });
      const response = await chamadaProtegida(rota, usuario.cookie);
      expect(response.status).toBe(401);
    },
  );

  it("usa o papel atual do banco apos alteracao administrativa", async () => {
    const comprador = ator("comprador");
    const troca = await request(app)
      .patch(`/admin/usuarios/${comprador.id}/papel`)
      .set("Cookie", ator("admin").cookie)
      .send({ papel: "artesao" });
    expect(troca.status).toBe(200);
    const response = await request(app)
      .post("/pedidos")
      .set("Cookie", comprador.cookie)
      .send({ itens: [{ produtoId: await novoProduto(), quantidade: 1 }] });
    expect(response.status).toBe(403);
  });

  it("retira acesso administrativo mesmo com papel admin no JWT antigo", async () => {
    const admin = ator("admin");
    await prisma.usuario.update({
      where: { id: admin.id },
      data: { papel: "comprador" },
    });
    const response = await chamadaProtegida("admin", admin.cookie);
    expect(response.status).toBe(403);
  });

  it("recusa elevar privilegio confiando apenas nas claims", async () => {
    const comprador = ator("comprador");
    const token = jwt.sign(
      { sub: comprador.id, papel: "admin", nome: "Admin declarado" },
      secret,
      { expiresIn: "24h" },
    );
    const response = await chamadaProtegida("admin", `origem_sessao=${token}`);
    expect(response.status).toBe(403);
  });
});

describe("WEB-04: entradas e limites administrativos", () => {
  it.each(["compradorId", "compradorRef", "outro"])(
    "rejeita a chave extra %s no checkout",
    async (chave) => {
      const produtoId = await novoProduto();
      const response = await request(app)
        .post("/pedidos")
        .set("Cookie", ator("comprador").cookie)
        .send({ itens: [{ produtoId, quantidade: 1 }], [chave]: randomUUID() });
      expect(response.status).toBe(400);
      expect(
        (await prisma.produto.findUniqueOrThrow({ where: { id: produtoId } }))
          .quantidadeEstoque,
      ).toBe(5);
      expect(
        await prisma.pedido.count({
          where: { compradorId: { in: usuarioIds } },
        }),
      ).toBe(0);
    },
  );

  it("rejeita campos extras dentro dos itens do checkout", async () => {
    const response = await request(app)
      .post("/pedidos")
      .set("Cookie", ator("comprador").cookie)
      .send({
        itens: [{ produtoId: await novoProduto(), quantidade: 1, preco: 0.01 }],
      });
    expect(response.status).toBe(400);
  });

  it.each([false, true])(
    "impede admin alterar o proprio papel com UUID maiusculo=%s",
    async (maiusculo) => {
      const admin = ator("admin");
      const id = maiusculo ? admin.id.toUpperCase() : admin.id;
      const response = await request(app)
        .patch(`/admin/usuarios/${id}/papel`)
        .set("Cookie", admin.cookie)
        .send({ papel: "comprador" });
      expect(response.status).toBe(403);
      expect(
        (await prisma.usuario.findUniqueOrThrow({ where: { id: admin.id } }))
          .papel,
      ).toBe("admin");
    },
  );

  it.each([
    { papel: "admin" },
    { papel: "outro" },
    { papel: "" },
    { papel: 1 },
    {},
    { papel: "artesao", ativo: false },
  ])("valida papel e campos extras: %j", async (body) => {
    const comprador = ator("comprador");
    const response = await request(app)
      .patch(`/admin/usuarios/${comprador.id}/papel`)
      .set("Cookie", ator("admin").cookie)
      .send(body);
    expect(response.status).toBe(400);
    expect(
      (await prisma.usuario.findUniqueOrThrow({ where: { id: comprador.id } }))
        .papel,
    ).toBe("comprador");
  });

  it("valida UUID do usuario alvo", async () => {
    const response = await request(app)
      .patch("/admin/usuarios/nao-e-uuid/papel")
      .set("Cookie", ator("admin").cookie)
      .send({ papel: "artesao" });
    expect(response.status).toBe(400);
  });

  it("retorna 404 para usuario alvo ausente", async () => {
    const response = await request(app)
      .patch(`/admin/usuarios/${randomUUID()}/papel`)
      .set("Cookie", ator("admin").cookie)
      .send({ papel: "artesao" });
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      error: { code: "USUARIO_NAO_ENCONTRADO" },
    });
  });

  it("permite admin alterar artesao para comprador preservando dados pessoais", async () => {
    const alvo = await novoUsuario("artesao");
    const antes = await prisma.usuario.findUniqueOrThrow({
      where: { id: alvo.id },
    });
    const response = await request(app)
      .patch(`/admin/usuarios/${alvo.id}/papel`)
      .set("Cookie", ator("admin").cookie)
      .send({ papel: "comprador" });
    expect(response.status).toBe(200);
    const depois = await prisma.usuario.findUniqueOrThrow({
      where: { id: alvo.id },
    });
    expect(depois).toEqual({ ...antes, papel: "comprador" });
    expect(response.text).not.toContain("senhaHash");
  });
});

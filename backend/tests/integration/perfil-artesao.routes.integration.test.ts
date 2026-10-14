import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

const secret = "segredo-sintetico-exclusivo-testes-web07";
const tecnicaId = "tecnica-modelagem-argila";
const regiaoId = "regiao-alto-moura-caruaru";
const input = { historia: "Historia sintetica", tecnicaId, regiaoId };
let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let app: ReturnType<typeof createApp>;
let artesaoId: string;
let terceiroId: string;
let adminId: string;
let compradorId: string;
let inativoId: string;
let produtoId: string;

function cookie(id: string, papel = "artesao") {
  return `origem_sessao=${jwt.sign({ papel, nome: "Sintetico" }, secret, { subject: id, expiresIn: "1h" })}`;
}
function rota(id = artesaoId) {
  return `/usuarios/${id}/perfil-artesao`;
}
async function usuario(papel: "artesao" | "comprador" | "admin", ativo = true) {
  return banco.prisma.usuario.create({
    data: {
      nome: "Artesao sintetico WEB07",
      email: `${randomUUID()}@teste.origem`,
      senhaHash: "hash-sintetico",
      papel,
      ativo,
      ...(papel === "artesao" ? { perfilArtesao: { create: {} } } : {}),
    },
  });
}
beforeAll(async () => {
  banco = await criarBancoAuth();
  app = createApp(banco.prisma, { JWT_SECRET: secret, COOKIE_SECURE: false });
  artesaoId = (await usuario("artesao")).id;
  terceiroId = (await usuario("artesao")).id;
  adminId = (await usuario("admin")).id;
  compradorId = (await usuario("comprador")).id;
  inativoId = (await usuario("artesao", false)).id;
  const categoria = await banco.prisma.categoria.create({
    data: { nome: "Categoria WEB07" },
  });
  produtoId = (
    await banco.prisma.produto.create({
      data: {
        nome: "Peca WEB07",
        descricao: "Sintetica",
        preco: 25,
        artesaoId,
        categoriaId: categoria.id,
        tecnicaId,
        quantidadeEstoque: 2,
      },
    })
  ).id;
}, 30_000);
beforeEach(async () => {
  await banco.prisma.perfilArtesao.update({
    where: { usuarioId: artesaoId },
    data: {
      historia: input.historia,
      tecnicaPrincipalId: tecnicaId,
      regiaoId,
      foto: "https://example.test/foto.jpg",
      completo: true,
    },
  });
});
afterAll(async () => {
  await banco?.fechar();
});

describe("WEB-07 perfil do artesao", () => {
  it("publica somente campos publicos e reaproveita produtos por artesao", async () => {
    const produto = await request(app).get(`/produtos/${produtoId}`);
    expect(produto.status).toBe(200);
    const perfil = await request(app).get(rota(produto.body.artesaoId));
    expect(perfil.status).toBe(200);
    expect(perfil.headers["cache-control"]).toBe("no-store");
    expect(perfil.body).toEqual({
      artesaoId,
      nome: "Artesao sintetico WEB07",
      ...input,
      fotoUrl: "https://example.test/foto.jpg",
      completo: true,
    });
    const lista = await request(app).get("/produtos").query({ artesaoId });
    expect(lista.status).toBe(200);
    expect(lista.body.map((p: { id: string }) => p.id)).toEqual([produtoId]);
  });
  it("inativo, inexistente e outros papeis retornam o mesmo 404", async () => {
    const ausente = await request(app).get(rota(randomUUID()));
    expect(ausente.status).toBe(404);
    for (const id of [inativoId, adminId, compradorId]) {
      const response = await request(app).get(rota(id));
      expect(response.status).toBe(404);
      expect(response.body).toEqual(ausente.body);
    }
  });
  it("artesao sem campos preenchidos possui perfil publico incompleto", async () => {
    const response = await request(app).get(rota(terceiroId));
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      artesaoId: terceiroId,
      nome: "Artesao sintetico WEB07",
      historia: "",
      tecnicaId: "",
      regiaoId: "",
      completo: false,
    });
  });
  it.each(["anonimo", "terceiro", "admin", "comprador"])(
    "bloqueia PATCH como %s sem alterar o banco",
    async (ator) => {
      const chamada = request(app).patch(rota());
      if (ator !== "anonimo")
        chamada.set(
          "Cookie",
          cookie(
            ator === "terceiro"
              ? terceiroId
              : ator === "admin"
                ? adminId
                : compradorId,
            ator === "terceiro" ? "artesao" : ator,
          ),
        );
      const response = await chamada.send({ ...input, historia: "Alterada" });
      expect(response.status).toBe(ator === "anonimo" ? 401 : 403);
      expect(
        (
          await banco.prisma.perfilArtesao.findUniqueOrThrow({
            where: { usuarioId: artesaoId },
          })
        ).historia,
      ).toBe(input.historia);
    },
  );
  it("salva o proprio perfil normalizando UUID e recalculando completo", async () => {
    const response = await request(app)
      .patch(rota(artesaoId.toUpperCase()))
      .set("Cookie", cookie(artesaoId))
      .send({ ...input, historia: "  Nova historia  ", fotoUrl: "" });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      historia: "Nova historia",
      completo: true,
    });
    expect(response.body).not.toHaveProperty("fotoUrl");
    expect(
      await banco.prisma.perfilArtesao.findUniqueOrThrow({
        where: { usuarioId: artesaoId },
      }),
    ).toMatchObject({ historia: "Nova historia", completo: true, foto: null });
    const incompleto = await request(app)
      .patch(rota())
      .set("Cookie", cookie(artesaoId))
      .send({ historia: "   " });
    expect(incompleto.status).toBe(200);
    expect(incompleto.body).toMatchObject({
      historia: "",
      tecnicaId,
      regiaoId,
      completo: false,
    });
    expect(
      (
        await banco.prisma.perfilArtesao.findUniqueOrThrow({
          where: { usuarioId: artesaoId },
        })
      ).completo,
    ).toBe(false);
  });
  it("aceita exatamente mil caracteres e preserva campos omitidos", async () => {
    const response = await request(app)
      .patch(rota())
      .set("Cookie", cookie(artesaoId))
      .send({ historia: "a".repeat(1000) });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      tecnicaId,
      regiaoId,
      fotoUrl: "https://example.test/foto.jpg",
      completo: true,
    });
  });
  it.each([
    { historia: "a".repeat(1001) },
    { historia: 123 },
    {},
    { completo: true },
    { nome: "Outro" },
    { usuarioId: "outro" },
    { tecnicaId: "inexistente" },
    { regiaoId: "inexistente" },
    { fotoUrl: "javascript:alert(1)" },
    { fotoUrl: "//evil.test/foto" },
    { fotoUrl: "/\\evil.test/foto" },
  ])("rejeita entrada invalida sem alterar o banco %#", async (data) => {
    const response = await request(app)
      .patch(rota())
      .set("Cookie", cookie(artesaoId))
      .send(data);
    expect(response.status).toBe(400);
    expect(
      (
        await banco.prisma.perfilArtesao.findUniqueOrThrow({
          where: { usuarioId: artesaoId },
        })
      ).historia,
    ).toBe(input.historia);
  });
  it("limpa referencias e recalcula pendencias sem aceitar completo do cliente", async () => {
    const response = await request(app)
      .patch(rota())
      .set("Cookie", cookie(artesaoId))
      .send({ tecnicaId: "", regiaoId: "" });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      tecnicaId: "",
      regiaoId: "",
      completo: false,
    });
  });
  it("valida UUID na borda", async () => {
    expect((await request(app).get(rota("invalido"))).status).toBe(400);
  });
});

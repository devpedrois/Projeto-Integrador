import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { criarBancoAuth } from "../helpers/auth-database.js";
import { FotoDiscoTemporario } from "../helpers/foto-storage.js";

const secret = "segredo-sintetico-exclusivo-web6-foto-perfil";
const rota = "/artesao/perfil/foto";
const jpg = Buffer.alloc(500 * 1024, 0);
jpg.set([0xff, 0xd8, 0xff, 0xe0]);
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let app: ReturnType<typeof createApp>;
let raiz: string;
let artesaoId: string;
let terceiroId: string;
let compradorId: string;
let adminId: string;
let inativoId: string;
let storage: FotoDiscoTemporario;
const cookie = (id: string) =>
  `origem_sessao=${jwt.sign({ papel: "artesao", nome: "Sintetico" }, secret, { subject: id, expiresIn: "1h" })}`;
const perfil = () =>
  banco.prisma.perfilArtesao.findUniqueOrThrow({
    where: { usuarioId: artesaoId },
  });
const enviar = (bytes = jpg, mime = "image/jpeg", id = artesaoId) =>
  request(app).post(rota).set("Cookie", cookie(id)).attach("foto", bytes, {
    filename: "../../cliente.jpg",
    contentType: mime,
  });

beforeAll(async () => {
  banco = await criarBancoAuth();
  raiz = await mkdtemp(join(tmpdir(), "origem-web6-"));
  storage = new FotoDiscoTemporario(raiz);
  app = createApp(
    banco.prisma,
    { JWT_SECRET: secret, COOKIE_SECURE: false },
    { fotoStorage: storage },
  );
  const ids: string[] = [];
  for (const papel of [
    "artesao",
    "artesao",
    "comprador",
    "admin",
    "artesao",
  ] as const) {
    const usuario = await banco.prisma.usuario.create({
      data: {
        nome: "Sintetico Web.6",
        email: `${randomUUID()}@teste.origem`,
        senhaHash: "sintetico",
        papel,
        ativo: ids.length !== 4,
        ...(papel === "artesao" ? { perfilArtesao: { create: {} } } : {}),
      },
    });
    ids.push(usuario.id);
  }
  [artesaoId, terceiroId, compradorId, adminId, inativoId] = ids as [
    string,
    string,
    string,
    string,
    string,
  ];
}, 30_000);
afterAll(async () => {
  await banco?.fechar();
  if (raiz) await rm(raiz, { recursive: true, force: true });
});

describe("Web.6 upload real com PostgreSQL e disco temporario", () => {
  it("exige sessao e papel antes de processar o arquivo", async () => {
    expect(
      (
        await request(app)
          .post(rota)
          .attach("foto", jpg.subarray(0, 4), "foto.jpg")
      ).status,
    ).toBe(401);
    for (const id of [compradorId, adminId, inativoId]) {
      expect((await enviar(jpg.subarray(0, 4), "image/jpeg", id)).status).toBe(
        id === inativoId ? 401 : 403,
      );
    }
    expect((await perfil()).foto).toBeNull();
    expect(await readdir(raiz)).toEqual([]);
  });
  it.each([
    ["PDF renomeado", Buffer.from("%PDF-1.7"), "image/jpeg", 400],
    [
      "PNG de 3 MB",
      Buffer.concat([png, Buffer.alloc(3 * 1024 * 1024)]),
      "image/png",
      413,
    ],
    ["GIF", Buffer.from("GIF89a"), "image/gif", 400],
    ["MIME divergente", png, "image/jpeg", 400],
    ["MIME ausente", jpg, "application/octet-stream", 400],
    ["vazio", Buffer.alloc(0), "image/jpeg", 400],
    ["assinatura truncada", Buffer.from([0xff, 0xd8]), "image/jpeg", 400],
  ])(
    "rejeita %s preservando foto e disco",
    async (_nome, bytes, mime, status) => {
      const anterior = (await perfil()).foto;
      const response = await enviar(bytes, mime);
      expect(response.status).toBe(status);
      expect(response.body).toHaveProperty("error.code");
      expect((await perfil()).foto).toBe(anterior);
      expect(await readdir(raiz)).toEqual([]);
    },
  );
  it("exige um unico arquivo foto sem campos extras", async () => {
    const chamadas = [
      request(app).post(rota).set("Cookie", cookie(artesaoId)).send({}),
      request(app)
        .post(rota)
        .set("Cookie", cookie(artesaoId))
        .field("usuarioId", terceiroId)
        .attach("foto", jpg, "foto.jpg"),
      request(app)
        .post(rota)
        .set("Cookie", cookie(artesaoId))
        .attach("outro", jpg, "foto.jpg"),
      enviar().attach("foto", jpg, "segundo.jpg"),
    ];
    for (const chamada of chamadas) expect((await chamada).status).toBe(400);
  });
  it("aceita JPG 500 KB com UUID e substitui removendo anterior", async () => {
    const response = await enviar();
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    const url = response.body.fotoUrl as string;
    expect(url).toMatch(
      new RegExp(`/perfis/${artesaoId}/[a-f0-9-]{36}\\.jpg$`),
    );
    expect((await perfil()).foto).toBe(url);
    expect(await readFile(join(raiz, new URL(url).pathname))).toEqual(jpg);
    const seguinte = await enviar(png, "image/png");
    expect(seguinte.status).toBe(200);
    expect(seguinte.body.fotoUrl).toMatch(/\.png$/);
    await expect(
      readFile(join(raiz, new URL(url).pathname)),
    ).rejects.toMatchObject({ code: "ENOENT" });
    expect((await perfil()).foto).toBe(seguinte.body.fotoUrl);
    expect(
      (
        await banco.prisma.perfilArtesao.findUniqueOrThrow({
          where: { usuarioId: terceiroId },
        })
      ).foto,
    ).toBeNull();
    expect(response.body).not.toHaveProperty("senhaHash");
  });
  it("aceita exatamente 2 MB e serializa substituicoes concorrentes", async () => {
    const limite = Buffer.alloc(2 * 1024 * 1024);
    png.copy(limite);
    expect((await enviar(limite, "image/png")).status).toBe(200);
    const respostas = await Promise.all([enviar(), enviar()]);
    expect(respostas.map((r) => r.status)).toEqual([200, 200]);
    const arquivos = await readdir(join(raiz, "perfis", artesaoId));
    expect(arquivos).toEqual([(await perfil()).foto?.split("/").at(-1)]);
  });
  it("nao remove foto de terceiro injetada pelo PATCH", async () => {
    const terceiro = await enviar(jpg, "image/jpeg", terceiroId);
    expect(terceiro.status).toBe(200);
    await request(app)
      .patch(`/usuarios/${artesaoId}/perfil-artesao`)
      .set("Cookie", cookie(artesaoId))
      .send({ fotoUrl: terceiro.body.fotoUrl });
    expect((await enviar()).status).toBe(200);
    expect(
      await readFile(join(raiz, new URL(terceiro.body.fotoUrl).pathname)),
    ).toEqual(jpg);
  });
  it("falha no banco compensa o arquivo novo sem expor detalhes", async () => {
    const usuario = await banco.prisma.usuario.create({
      data: {
        nome: "Falha transacional",
        email: `${randomUUID()}@teste.origem`,
        senhaHash: "sintetico",
        papel: "artesao",
      },
    });
    const resposta = await enviar(jpg, "image/jpeg", usuario.id);
    expect(resposta.status).toBe(503);
    expect(resposta.body).toEqual({
      error: {
        code: "FOTO_INDISPONIVEL",
        message: "Nao foi possivel salvar a foto. Tente novamente.",
      },
    });
    expect(await readdir(join(raiz, "perfis", usuario.id))).toEqual([]);
    expect(
      await banco.prisma.perfilArtesao.findUnique({
        where: { usuarioId: usuario.id },
      }),
    ).toBeNull();
  });
  it("falha de storage preserva banco e nao vaza token na resposta", async () => {
    const anterior = (await perfil()).foto;
    class StorageFalho extends FotoDiscoTemporario {
      override async salvar(): Promise<string> {
        throw new Error("BLOB_READ_WRITE_TOKEN=segredo-sintetico-nao-expor");
      }
    }
    const appFalho = createApp(
      banco.prisma,
      { JWT_SECRET: secret, COOKIE_SECURE: false },
      { fotoStorage: new StorageFalho(raiz) },
    );
    const resposta = await request(appFalho)
      .post(rota)
      .set("Cookie", cookie(artesaoId))
      .attach("foto", jpg, { filename: "foto.jpg", contentType: "image/jpeg" });
    expect(resposta.status).toBe(503);
    expect(JSON.stringify(resposta.body)).not.toContain("segredo-sintetico");
    expect((await perfil()).foto).toBe(anterior);
  });
});

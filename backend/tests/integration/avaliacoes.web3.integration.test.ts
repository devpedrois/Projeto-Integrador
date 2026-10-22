import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

const secret = "segredo-sintetico-web3-apenas-testes";
let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let app: ReturnType<typeof createApp>;
let produtoId: string;
let contextoId: string;
const usuarios: Record<string, string> = {};

function usuario(papel: string): string {
  const id = usuarios[papel];
  if (!id) throw new Error("Fixture Web.3 ausente");
  return id;
}
function cookie(papel = "comprador") {
  return `origem_sessao=${jwt.sign({ nome: "Conta sintetica", papel: papel.startsWith("comprador") ? "comprador" : papel }, secret, { subject: usuario(papel), expiresIn: "1h" })}`;
}
async function produto() {
  return banco.prisma.produto.create({
    data: {
      nome: "Peca sintetica Web.3",
      descricao: "Avaliacao sintetica",
      preco: "12.30",
      quantidadeEstoque: 20,
      artesaoId: usuario("artesao"),
      categoriaId: (await banco.prisma.categoria.findFirstOrThrow()).id,
      tecnicaId: "tecnica-modelagem-argila",
    },
  });
}

beforeAll(async () => {
  banco = await criarBancoAuth();
  app = createApp(banco.prisma, { JWT_SECRET: secret, COOKIE_SECURE: false });
  for (const papel of [
    "comprador",
    "comprador2",
    "artesao",
    "admin",
  ] as const) {
    const criado = await banco.prisma.usuario.create({
      data: {
        nome: "Conta sintetica Web.3",
        email: `${randomUUID()}@teste.origem`,
        senhaHash: "hash-sintetico",
        papel: papel.startsWith("comprador")
          ? "comprador"
          : (papel as "artesao" | "admin"),
      },
    });
    usuarios[papel] = criado.id;
  }
  await banco.prisma.perfilArtesao.create({
    data: {
      usuarioId: usuario("artesao"),
      tecnicaPrincipalId: "tecnica-modelagem-argila",
      regiaoId: "regiao-alto-moura-caruaru",
    },
  });
  await banco.prisma.categoria.create({ data: { nome: "Web.3" } });
  produtoId = (await produto()).id;
  contextoId = (await produto()).id;
}, 40_000);

afterAll(async () => {
  await banco?.fechar();
});

describe("Web.3 avaliacoes HTTP em PostgreSQL real", () => {
  it("grava identidade do token, normaliza comentario e recalcula media na leitura", async () => {
    const antes = await request(app).get(`/avaliacoes?produtoId=${produtoId}`);
    expect(antes.body.resumo).toEqual({ media: 0, total: 0 });
    const primeira = await request(app)
      .post("/avaliacoes")
      .set("Cookie", cookie())
      .send({
        produtoId: produtoId.toUpperCase(),
        nota: 5,
        comentario: "  Peca bem acabada.  ",
      });
    expect(primeira.status).toBe(201);
    expect(primeira.body).toEqual({
      id: expect.any(String),
      produtoId,
      compradorId: usuario("comprador"),
      nota: 5,
      comentario: "Peca bem acabada.",
      criadoEm: expect.any(String),
    });
    expect(primeira.headers["cache-control"]).toBe("no-store");
    expect(primeira.text).not.toMatch(/email|senha|hash|cookie/i);
    const segunda = await request(app)
      .post("/avaliacoes")
      .set("Cookie", cookie("comprador2"))
      .send({ produtoId, nota: 2 });
    expect(segunda.status).toBe(201);
    expect(segunda.body).not.toHaveProperty("comentario");
    const leitura = await request(app).get(
      `/avaliacoes?produtoId=${produtoId}`,
    );
    expect(leitura.status).toBe(200);
    expect(leitura.body.resumo).toEqual({ media: 3.5, total: 2 });
    expect(leitura.body.itens).toEqual(
      expect.arrayContaining([primeira.body, segunda.body]),
    );
    expect(await banco.prisma.avaliacao.count({ where: { produtoId } })).toBe(
      2,
    );
  });

  it("retorna 409 na segunda avaliacao e preserva a primeira", async () => {
    const response = await request(app)
      .post("/avaliacoes")
      .set("Cookie", cookie())
      .send({ produtoId, nota: 1 });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("AVALIACAO_DUPLICADA");
    const registrada = await banco.prisma.avaliacao.findUniqueOrThrow({
      where: {
        compradorId_produtoId: { compradorId: usuario("comprador"), produtoId },
      },
    });
    expect(registrada.nota).toBe(5);
  });

  it("unicidade resiste a duas tentativas concorrentes", async () => {
    const alvo = await produto();
    const respostas = await Promise.all(
      [1, 2].map(() =>
        request(app)
          .post("/avaliacoes")
          .set("Cookie", cookie())
          .send({ produtoId: alvo.id, nota: 4 }),
      ),
    );
    expect(respostas.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    expect(
      await banco.prisma.avaliacao.count({ where: { produtoId: alvo.id } }),
    ).toBe(1);
  });

  it.each([
    { nota: 0 },
    { nota: 6 },
    { nota: 3.5 },
    { nota: "5" },
    { nota: null },
    { comentario: "a".repeat(501) },
    { comentario: null },
    { produtoId: "invalido" },
    { compradorId: "outra-conta" },
    { extra: true },
  ])("rejeita corpo invalido %j sem gravar", async (alteracao) => {
    const antes = await banco.prisma.avaliacao.count();
    const response = await request(app)
      .post("/avaliacoes")
      .set("Cookie", cookie())
      .send({ produtoId, nota: 4, ...alteracao });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDACAO");
    expect(response.text).not.toMatch(/Prisma|SELECT|stack/i);
    expect(await banco.prisma.avaliacao.count()).toBe(antes);
  });

  it("limita comentario depois do trim e omite comentario vazio", async () => {
    const alvo = await produto();
    const response = await request(app)
      .post("/avaliacoes")
      .set("Cookie", cookie())
      .send({
        produtoId: alvo.id,
        nota: 1,
        comentario: `  ${"a".repeat(500)}  `,
      });
    expect(response.status).toBe(201);
    expect(response.body.comentario).toBe("a".repeat(500));
    const vazio = await request(app)
      .post("/avaliacoes")
      .set("Cookie", cookie("comprador2"))
      .send({ produtoId: alvo.id, nota: 5, comentario: "   " });
    expect(vazio.status).toBe(201);
    expect(vazio.body).not.toHaveProperty("comentario");
  });

  it("exige comprador autenticado", async () => {
    expect(
      (await request(app).post("/avaliacoes").send({ produtoId, nota: 5 }))
        .status,
    ).toBe(401);
    for (const papel of ["artesao", "admin"]) {
      expect(
        (
          await request(app)
            .post("/avaliacoes")
            .set("Cookie", cookie(papel))
            .send({ produtoId, nota: 5 })
        ).status,
      ).toBe(403);
    }
  });

  it("produto inexistente retorna 404 seguro", async () => {
    const response = await request(app)
      .post("/avaliacoes")
      .set("Cookie", cookie())
      .send({ produtoId: randomUUID(), nota: 5 });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PRODUTO_NAO_ENCONTRADO");
    expect(response.text).not.toMatch(/Prisma|SELECT|stack/i);
  });

  it("escrita HTTP invalida caches e atualiza nota no catalogo e recomendacoes", async () => {
    const alvo = await produto();
    const rotas = [
      "/produtos",
      `/produtos/${alvo.id}`,
      `/recomendacoes?produtoId=${contextoId}`,
    ];
    for (const rota of rotas) {
      expect((await request(app).get(rota)).headers["x-cache"]).toBe("MISS");
      expect((await request(app).get(rota)).headers["x-cache"]).toBe("HIT");
    }
    const response = await request(app)
      .post("/avaliacoes")
      .set("Cookie", cookie())
      .send({ produtoId: alvo.id, nota: 4 });
    expect(response.status).toBe(201);
    for (const rota of rotas) {
      const leitura = await request(app).get(rota);
      expect(leitura.status).toBe(200);
      expect(leitura.headers["x-cache"]).toBe("MISS");
      if (rota === `/produtos/${alvo.id}`)
        expect(leitura.body.notaMedia).toBe(4);
    }
    expect(
      (await request(app).get(`/avaliacoes?produtoId=${alvo.id}`)).body.resumo,
    ).toEqual({ media: 4, total: 1 });
    const rejeitada = await request(app)
      .post("/avaliacoes")
      .set("Cookie", cookie())
      .send({ produtoId: alvo.id, nota: 2 });
    expect(rejeitada.status).toBe(409);
    for (const rota of rotas)
      expect((await request(app).get(rota)).headers["x-cache"]).toBe("HIT");
  });
});

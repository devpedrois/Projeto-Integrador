import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from "vitest";
import { createApp } from "../../src/app.js";
import { MemoryCacheStore } from "../../src/utils/cache.js";
import type { RegistroCache } from "../../src/utils/cache-http.js";
import { PrismaPedidoRepository } from "../../src/repositories/pedido.repository.js";
import { PrismaUsuarioRepository } from "../../src/repositories/usuario.repository.js";
import { criarBancoAuth } from "../helpers/auth-database.js";
import { criarFixtureCacheIndicadores } from "../helpers/indicadores-cache-fixture.js";

const secret = randomUUID();
let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let fixture: Awaited<ReturnType<typeof criarFixtureCacheIndicadores>>;
let app: ReturnType<typeof createApp>;
let store: MemoryCacheStore;
const logs: RegistroCache[] = [];
const chave = (id: string) => `indicadores:artesao:${id}`;

function cookie(id: string) {
  return `origem_sessao=${jwt.sign({ papel: "artesao", nome: "Pessoa sintetica" }, secret, { subject: id, expiresIn: "1h" })}`;
}

function consultar(id: string) {
  return request(app).get("/artesao/indicadores").set("Cookie", cookie(id));
}

beforeAll(async () => {
  banco = await criarBancoAuth();
}, 60000);

beforeEach(async () => {
  fixture = await criarFixtureCacheIndicadores(banco.prisma);
  store = new MemoryCacheStore();
  logs.length = 0;
  app = createApp(
    banco.prisma,
    {
      JWT_SECRET: secret,
      COOKIE_SECURE: false,
      CACHE_TTL_SECONDS: 1,
    },
    {
      cacheStore: store,
      logCache: (registro) => {
        logs.push(registro);
      },
    },
  );
}, 60000);

afterEach(() => vi.useRealTimers());
afterAll(async () => {
  await banco?.fechar();
});

it("isola dois artesaos pela identidade autenticada e mantem no-store", async () => {
  const esperado = [
    [fixture.a.id, { quantidadeVendida: 2, receitaTotal: 20 }],
    [fixture.b.id, { quantidadeVendida: 3, receitaTotal: 60 }],
  ] as const;
  for (const estado of ["MISS", "HIT"]) {
    for (const [id, indicadores] of esperado) {
      const response = await consultar(id);
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(indicadores);
      expect(response.headers["x-cache"]).toBe(estado);
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(await store.get(chave(id))).toEqual(response.body);
    }
  }
  expect(logs.map((r) => r.cache)).toEqual(["MISS", "MISS", "HIT", "HIT"]);
  expect(logs.every((r) => r.rota === "/artesao/indicadores")).toBe(true);
  expect(JSON.stringify(logs)).not.toMatch(/senha|cookie|token|usuarioId/);
  expect(JSON.stringify(logs)).not.toContain(fixture.a.id);
  expect(JSON.stringify(logs)).not.toContain(fixture.b.id);
});

it("mantem TTL absoluto de cinco minutos independente do cache publico", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const agora = Date.now();
  const primeira = await consultar(fixture.a.id);
  expect(primeira.headers["x-cache"]).toBe("MISS");
  vi.setSystemTime(agora + 299999);
  const quente = await consultar(fixture.a.id);
  expect(quente.headers["x-cache"]).toBe("HIT");
  expect(quente.body).toEqual(primeira.body);
  vi.setSystemTime(agora + 300000);
  expect((await consultar(fixture.a.id)).headers["x-cache"]).toBe("MISS");
});

it("checkout confirmado invalida somente os donos dos itens apos commit", async () => {
  const anteriores = new Map<string, unknown>();
  for (const artesao of [fixture.a, fixture.b, fixture.c]) {
    anteriores.set(artesao.id, (await consultar(artesao.id)).body);
    expect((await consultar(artesao.id)).headers["x-cache"]).toBe("HIT");
  }
  const response = await request(app)
    .post("/pedidos")
    .set("Cookie", cookie(fixture.compradorId))
    .send({
      itens: [
        { produtoId: fixture.a.produtoId, quantidade: 1 },
        { produtoId: fixture.b.produtoId, quantidade: 2 },
      ],
    });
  expect(response.status).toBe(201);
  expect(response.body).not.toHaveProperty("artesaoIds");
  expect(response.body.pedido).not.toHaveProperty("artesaoIds");
  expect(await store.get(chave(fixture.a.id))).toBeUndefined();
  expect(await store.get(chave(fixture.b.id))).toBeUndefined();
  expect(await store.get(chave(fixture.c.id))).toEqual(
    anteriores.get(fixture.c.id),
  );
  for (const [id, quantidadeVendida, receitaTotal] of [
    [fixture.a.id, 3, 30],
    [fixture.b.id, 5, 100],
  ] as const) {
    const leitura = await consultar(id);
    expect(leitura.headers["x-cache"]).toBe("MISS");
    expect(leitura.body).toMatchObject({
      quantidadeVendida,
      receitaTotal,
      numeroPedidos: 2,
    });
  }
  const terceiro = await consultar(fixture.c.id);
  expect(terceiro.headers["x-cache"]).toBe("HIT");
  expect(terceiro.body).toEqual(anteriores.get(fixture.c.id));
});

it("checkout revertido preserva o cache e os indicadores anteriores", async () => {
  const inicial = await consultar(fixture.a.id);
  const response = await request(app)
    .post("/pedidos")
    .set("Cookie", cookie(fixture.compradorId))
    .send({ itens: [{ produtoId: fixture.a.produtoId, quantidade: 6 }] });
  expect(response.status).toBe(409);
  const posterior = await consultar(fixture.a.id);
  expect(posterior.headers["x-cache"]).toBe("HIT");
  expect(posterior.body).toEqual(inicial.body);
});

it("a confirmacao entrega os donos identificados na propria transacao", async () => {
  const confirmado = await new PrismaPedidoRepository(banco.prisma).criar({
    compradorId: fixture.compradorId,
    itens: [
      { produtoId: fixture.a.produtoId, quantidade: 1 },
      { produtoId: fixture.b.produtoId, quantidade: 1 },
    ],
  });
  expect(confirmado).toHaveProperty("artesaoIds");
  expect(confirmado).toMatchObject({
    artesaoIds: expect.arrayContaining([fixture.a.id, fixture.b.id]),
  });
});

it("autoriza antes do cache e rejeita identidade externa ou papel revogado", async () => {
  await consultar(fixture.a.id);
  expect((await request(app).get("/artesao/indicadores")).status).toBe(401);
  expect((await consultar(fixture.compradorId)).status).toBe(403);
  expect(
    (
      await request(app)
        .get("/artesao/indicadores")
        .query({ usuarioId: fixture.b.id })
        .set("Cookie", cookie(fixture.a.id))
    ).status,
  ).toBe(400);
  await banco.prisma.usuario.update({
    where: { id: fixture.a.id },
    data: { papel: "comprador" },
  });
  const proibido = await consultar(fixture.a.id);
  expect(proibido.status).toBe(403);
  expect(proibido.headers["x-cache"]).toBeUndefined();
  expect(logs).toHaveLength(1);
});

it("cache aquecido nao autoriza usuario desativado nem token invalido", async () => {
  await consultar(fixture.a.id);
  expect(
    (await request(app).get("/auth/me").set("Cookie", cookie(fixture.a.id)))
      .body,
  ).toMatchObject({
    id: fixture.a.id,
    nome: expect.any(String),
    email: expect.any(String),
  });
  const invalido = await request(app)
    .get("/artesao/indicadores")
    .set("Cookie", "origem_sessao=token-invalido");
  expect(invalido.status).toBe(401);
  expect(invalido.headers["x-cache"]).toBeUndefined();
  await banco.prisma.usuario.update({
    where: { id: fixture.a.id },
    data: { ativo: false },
  });
  const desativado = await consultar(fixture.a.id);
  expect(desativado.status).toBe(401);
  expect(desativado.headers["x-cache"]).toBeUndefined();
});

it("consulta identidade publica no schema real e reflete revogacao imediatamente", async () => {
  const repository = new PrismaUsuarioRepository(banco.prisma);
  const usuario = await banco.prisma.usuario.findUniqueOrThrow({
    where: { id: fixture.a.id },
    select: { id: true, nome: true, email: true, papel: true },
  });
  expect(await repository.buscarIdentidadeAtivaPorId(fixture.a.id)).toEqual(
    usuario,
  );
  await banco.prisma.usuario.update({
    where: { id: fixture.a.id },
    data: { papel: "comprador" },
  });
  expect(await repository.buscarIdentidadeAtivaPorId(fixture.a.id)).toEqual({
    ...usuario,
    papel: "comprador",
  });
  await banco.prisma.usuario.update({
    where: { id: fixture.a.id },
    data: { ativo: false },
  });
  expect(await repository.buscarIdentidadeAtivaPorId(fixture.a.id)).toBeNull();
});

it("rejeita sessoes expiradas, algoritmos indevidos e sujeito invalido com cache quente", async () => {
  await consultar(fixture.a.id);
  const claims = { papel: "artesao", nome: "Pessoa sintetica" };
  const tokens = [
    jwt.sign(claims, secret, { subject: fixture.a.id, expiresIn: -1 }),
    jwt.sign(claims, secret, {
      subject: fixture.a.id,
      algorithm: "HS384",
      expiresIn: "1h",
    }),
    jwt.sign(claims, secret, { subject: "nao-e-uuid", expiresIn: "1h" }),
    jwt.sign(claims, secret, { subject: randomUUID(), expiresIn: "1h" }),
  ];
  for (const token of tokens) {
    const response = await request(app)
      .get("/artesao/indicadores")
      .set("Cookie", `origem_sessao=${token}`);
    expect(response.status).toBe(401);
    expect(response.headers["x-cache"]).toBeUndefined();
  }
  expect(logs).toHaveLength(1);
});

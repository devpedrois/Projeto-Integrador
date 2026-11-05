import { randomUUID } from "node:crypto";
import { createServer, type Server, type ServerResponse } from "node:http";
import { performance } from "node:perf_hooks";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import { iniciarRecomendacao } from "../../scripts/helpers/recomendacao-runtime.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let server: Server;
let url: string;
let contexto: string;
let comprador: string;
let modo: "ok" | "lento" | "invalido" | "status" = "ok";
let selecao: string[] = [];
const categoria: string[] = [];
const geral: string[] = [];
const invisiveis: string[] = [];
const secret = "synthetic-fallback-jwt-secret-with-32-characters";
const token = "synthetic-service-token-with-32-characters";

function obrigatorio<T>(valor: T | undefined): T {
  if (valor === undefined) throw new Error("Dado de teste ausente");
  return valor;
}

function app(timeout = 800) {
  return createApp(
    banco.prisma,
    {
      COOKIE_SECURE: false,
      JWT_SECRET: secret,
      RECOMENDACAO_URL: url,
      RECOMENDACAO_SERVICE_TOKEN: token,
      RECOMENDACAO_TIMEOUT_MS: timeout,
    },
    { logCache: () => {} },
  );
}

beforeAll(async () => {
  banco = await criarBancoAuth();
  const artesao = await banco.prisma.usuario.create({
    data: {
      nome: "Artesao sintetico",
      email: `${randomUUID()}@teste.origem`,
      senhaHash: "sintetico",
      papel: "artesao",
    },
  });
  comprador = (
    await banco.prisma.usuario.create({
      data: {
        nome: "Comprador sintetico",
        email: `${randomUUID()}@teste.origem`,
        senhaHash: "sintetico",
      },
    })
  ).id;
  const categorias = await Promise.all(
    ["Contexto", "Geral"].map((nome) =>
      banco.prisma.categoria.create({ data: { nome } }),
    ),
  );
  for (let i = 0; i < 15; i++) {
    const produto = await banco.prisma.produto.create({
      data: {
        nome: `Fallback ${i}`,
        descricao: "Sintetico",
        preco: 10,
        artesaoId: artesao.id,
        categoriaId: obrigatorio(categorias[i < 3 ? 0 : 1]).id,
        tecnicaId: "tecnica-modelagem-argila",
        quantidadeEstoque: i === 13 ? 0 : 5,
        ativo: i !== 12,
        desativadoPorAdmin: i === 14,
      },
    });
    if (i === 0) contexto = produto.id;
    else if (i < 3) categoria.push(produto.id);
    else if (i < 12) geral.push(produto.id);
    else invisiveis.push(produto.id);
    await banco.prisma.pedido.create({
      data: {
        compradorId: comprador,
        status: "confirmado",
        itens: {
          create: {
            produtoId: produto.id,
            quantidade: i === 0 || i >= 12 ? 1000 : i < 3 ? 3 - i : 100 - i,
          },
        },
      },
    });
  }
  await banco.prisma.pedido.create({
    data: {
      compradorId: comprador,
      status: "cancelado",
      itens: {
        create: { produtoId: obrigatorio(geral.at(-1)), quantidade: 10000 },
      },
    },
  });
  server = createServer((_req, res) => {
    const responder = () => {
      res.setHeader("Content-Type", "application/json");
      res.statusCode = modo === "status" ? 503 : 200;
      res.end(
        JSON.stringify(
          modo === "invalido"
            ? { segredo: token }
            : {
                estrategia: "categoria",
                produtoIds: selecao,
              },
        ),
      );
    };
    if (modo === "lento") setTimeout(responder, 1500).unref();
    else responder();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Porta ausente");
  url = `http://127.0.0.1:${address.port}`;
}, 120000);

afterAll(async () => {
  server?.closeAllConnections();
  if (server?.listening)
    await new Promise<void>((resolve) => server.close(() => resolve()));
  await banco?.fechar();
}, 60000);

it("retorna oito itens em cinco falhas e recupera na proxima chamada sem cache", async () => {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Porta ausente");
  await new Promise<void>((resolve) => server.close(() => resolve()));
  const api = app();
  const log = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    for (let i = 0; i < 5; i++) {
      const response = await request(api)
        .get("/recomendacoes")
        .query({ produtoId: contexto.toUpperCase() });
      expect(response.status).toBe(200);
      expect(response.body.estrategia).toBe("fallback-local");
      expect(response.body.itens.map((p: { id: string }) => p.id)).toEqual([
        ...categoria,
        ...geral.slice(0, 6),
      ]);
      expect(response.headers["x-cache"]).toBe("MISS");
      expect(response.headers["cache-control"]).toBe("no-store");
    }
    expect(log.mock.calls.map(([line]) => JSON.parse(line))).toEqual(
      Array.from({ length: 5 }, () => ({
        evento: "recomendacao-fallback-local",
        motivo: "rede",
      })),
    );
    const micro = await iniciarRecomendacao({
      databaseUrl: obrigatorio(process.env.DIRECT_URL),
      apiSchema: banco.schema,
    });
    try {
      await new Promise<void>((resolve) =>
        server.listen(address.port, "127.0.0.1", resolve),
      );
      const proxy = (_req: unknown, res: ServerResponse) => {
        void fetch(
          `${micro.environment.RECOMENDACAO_URL}/recomendacoes?produtoId=${contexto}`,
          {
            headers: {
              "X-Service-Token": micro.environment.RECOMENDACAO_SERVICE_TOKEN,
            },
          },
        )
          .then((r) => r.text())
          .then((body) => res.end(body))
          .catch(() => {
            res.statusCode = 503;
            res.end();
          });
      };
      const listeners = server.listeners("request");
      server.removeAllListeners("request");
      server.on("request", proxy);
      try {
        const contextoProduto = await banco.prisma.produto.findUniqueOrThrow({
          where: { id: contexto },
        });
        await banco.prisma.produto.updateMany({
          where: { id: { in: geral.slice(0, 6) } },
          data: { categoriaId: contextoProduto.categoriaId },
        });
        const recuperada = await request(api)
          .get("/recomendacoes")
          .query({ produtoId: contexto });
        expect(recuperada.status).toBe(200);
        expect(recuperada.body.estrategia).toBe("categoria");
        expect(recuperada.body.itens).toHaveLength(8);
        expect(recuperada.headers["x-cache"]).toBe("MISS");
        expect(
          (
            await request(api)
              .get("/recomendacoes")
              .query({ produtoId: contexto })
          ).headers["x-cache"],
        ).toBe("HIT");
      } finally {
        const geralProduto = await banco.prisma.produto.findUniqueOrThrow({
          where: { id: obrigatorio(geral[8]) },
        });
        await banco.prisma.produto.updateMany({
          where: { id: { in: geral.slice(0, 6) } },
          data: { categoriaId: geralProduto.categoriaId },
        });
        server.removeAllListeners("request");
        for (const listener of listeners) server.on("request", listener);
      }
    } finally {
      await micro.parar();
    }
  } finally {
    if (!server.listening)
      await new Promise<void>((resolve) =>
        server.listen(address.port, "127.0.0.1", resolve),
      );
    log.mockRestore();
  }
}, 120000);

it.each(["lento", "invalido", "status"] as const)(
  "degrada com motivo seguro: %s",
  async (falha) => {
    modo = falha;
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const inicio = performance.now();
      const response = await request(app(100))
        .get("/recomendacoes")
        .query({ produtoId: contexto });
      expect(response.status).toBe(200);
      expect(response.body.estrategia).toBe("fallback-local");
      expect(response.body.itens).toHaveLength(8);
      if (falha === "lento")
        expect(performance.now() - inicio).toBeLessThan(1100);
      expect(log.mock.calls.map(([line]) => JSON.parse(line))).toEqual([
        {
          evento: "recomendacao-fallback-local",
          motivo:
            falha === "lento"
              ? "timeout"
              : falha === "invalido"
                ? "resposta-invalida"
                : "status",
        },
      ]);
    } finally {
      log.mockRestore();
      modo = "ok";
    }
  },
);

it("completa selecao parcial preservando ordem, visibilidade e exclusoes sem cache", async () => {
  const api = app();
  selecao = [
    obrigatorio(categoria[1]),
    contexto,
    obrigatorio(invisiveis[0]),
    obrigatorio(categoria[1]),
  ];
  for (let i = 0; i < 2; i++) {
    const response = await request(api)
      .get("/recomendacoes")
      .query({ produtoId: contexto });
    expect(response.status).toBe(200);
    expect(response.body.estrategia).toBe("misto");
    expect(response.body.itens.map((p: { id: string }) => p.id)).toEqual([
      categoria[1],
      categoria[0],
      ...geral.slice(0, 6),
    ]);
    expect(response.headers["x-cache"]).toBe("MISS");
  }
  selecao = geral.slice(0, 8);
  const response = await request(api)
    .get("/recomendacoes")
    .query({ produtoId: contexto });
  expect(response.body.estrategia).toBe("categoria");
  expect(response.body.itens.map((p: { id: string }) => p.id)).toEqual(selecao);
  expect(response.headers["x-cache"]).toBe("MISS");
});

it("para-mim completa por vendas gerais sem compartilhar cache", async () => {
  const novo = await banco.prisma.usuario.create({
    data: {
      nome: "Sem historico sintetico",
      email: `${randomUUID()}@teste.origem`,
      senhaHash: "sintetico",
    },
  });
  const cookie = `origem_sessao=${jwt.sign({ papel: "comprador", nome: "Sintetico" }, secret, { subject: novo.id, expiresIn: "1h" })}`;
  for (const falha of [false, true]) {
    selecao = [obrigatorio(categoria[1])];
    modo = falha ? "status" : "ok";
    const response = await request(app())
      .get("/recomendacoes/para-mim")
      .set("Cookie", cookie);
    expect(response.status).toBe(200);
    expect(response.body.estrategia).toBe(falha ? "fallback-local" : "misto");
    expect(response.body.itens.map((p: { id: string }) => p.id)).toEqual(
      falha
        ? [contexto, ...geral.slice(0, 7)]
        : [categoria[1], contexto, ...geral.slice(0, 6)],
    );
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["x-cache"]).toBeUndefined();
  }
  modo = "ok";
});

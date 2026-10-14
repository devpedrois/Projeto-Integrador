import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { HistoricoCompraRecomendacaoStrategy } from "../../src/integrations/recommendation/historico-compra-recomendacao.strategy.js";
import { PrismaRecomendacaoRepository } from "../../src/repositories/recomendacao.repository.js";
import type {
  PapelUsuario,
  StatusPedido,
} from "../../src/generated/prisma/enums.js";
import type { Prisma } from "../../src/generated/prisma/client.js";
import { MemoryCacheStore } from "../../src/utils/cache.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let app: ReturnType<typeof createApp>;
const secret = "segredo-sintetico-ia03-historico";
let comprador: string;
let semHistorico: string;
let outroComprador: string;
let artesao: string;
let admin: string;
let ceramica: string;
let tecido: string;
let comprado: string;
let geral: string;
const candidatos: string[] = [];
const cache = new MemoryCacheStore();

function cookie(id: string, papel: PapelUsuario = "comprador") {
  return `origem_sessao=${jwt.sign({ papel, nome: "Sintetico" }, secret, { subject: id, expiresIn: "1h" })}`;
}

async function usuario(papel: PapelUsuario = "comprador") {
  return (
    await banco.prisma.usuario.create({
      data: {
        nome: "Sintetico IA-03",
        email: `${randomUUID()}@teste.origem`,
        senhaHash: "hash-sintetico",
        papel,
      },
    })
  ).id;
}

async function produto(
  categoriaId: string,
  extra: Partial<Prisma.ProdutoUncheckedCreateInput> = {},
) {
  return (
    await banco.prisma.produto.create({
      data: {
        nome: "Ceramica IA-03",
        descricao: "Produto sintetico",
        preco: 10,
        categoriaId,
        artesaoId: artesao,
        tecnicaId: "tecnica-modelagem-argila",
        quantidadeEstoque: 5,
        ...extra,
      },
    })
  ).id;
}

async function pedido(
  compradorId: string,
  produtoId: string,
  quantidade = 1,
  status: StatusPedido = "confirmado",
) {
  return banco.prisma.pedido.create({
    data: {
      compradorId,
      status,
      numero: `IA03-${randomUUID()}`,
      itens: { create: { produtoId, quantidade } },
    },
  });
}

beforeAll(async () => {
  banco = await criarBancoAuth();
  app = createApp(
    banco.prisma,
    { JWT_SECRET: secret, COOKIE_SECURE: false },
    { cacheStore: cache, logCache: () => {} },
  );
  comprador = await usuario();
  semHistorico = await usuario();
  outroComprador = await usuario();
  artesao = await usuario("artesao");
  admin = await usuario("admin");
  ceramica = (
    await banco.prisma.categoria.create({ data: { nome: "Ceramica IA-03" } })
  ).id;
  tecido = (
    await banco.prisma.categoria.create({ data: { nome: "Tecido IA-03" } })
  ).id;
  comprado = await produto(ceramica);
  await pedido(comprador, comprado, 100);
  await pedido(comprador, comprado);
  geral = await produto(tecido, { nome: "Tecido IA-03" });
  await pedido(outroComprador, geral, 200);
  await pedido(comprador, geral, 1, "pendente");
  await pedido(comprador, geral, 1, "cancelado");
  const uuids = Array.from({ length: 10 }, () => randomUUID()).sort();
  for (const [indice, id] of uuids.entries()) {
    candidatos.push(await produto(ceramica, { id }));
    await pedido(outroComprador, id, indice === 3 ? 20 : indice < 3 ? 10 : 1);
    await banco.prisma.avaliacao.create({
      data: {
        compradorId: outroComprador,
        produtoId: id,
        nota: indice === 1 ? 4 : 5,
      },
    });
  }
  for (const extra of [
    { ativo: false },
    { quantidadeEstoque: 0 },
    { desativadoPorAdmin: true },
  ]) {
    await pedido(outroComprador, await produto(ceramica, extra), 1000);
  }
  const inativo = await usuario("artesao");
  await banco.prisma.usuario.update({
    where: { id: inativo },
    data: { ativo: false },
  });
  await pedido(
    outroComprador,
    await produto(ceramica, { artesaoId: inativo }),
    1000,
  );
}, 60_000);

afterAll(async () => {
  if (banco) await banco.fechar();
});

describe("IA-03: historico real do comprador autenticado", () => {
  it("Strategy seleciona categorias confirmadas no PostgreSQL real", async () => {
    const strategy = new HistoricoCompraRecomendacaoStrategy(
      new PrismaRecomendacaoRepository(banco.prisma),
    );
    expect(await strategy.obter({ usuarioId: comprador })).toEqual({
      estrategia: "historico-compra",
      produtoIds: [
        candidatos[3],
        candidatos[0],
        candidatos[2],
        candidatos[1],
        ...candidatos.slice(4, 8),
      ],
    });
  });

  it("Strategy sem historico identifica fallback geral", async () => {
    const strategy = new HistoricoCompraRecomendacaoStrategy(
      new PrismaRecomendacaoRepository(banco.prisma),
    );
    const resultado = await strategy.obter({ usuarioId: semHistorico });
    expect(resultado.estrategia).toBe("fallback-geral");
    expect(resultado.produtoIds[0]).toBe(geral);
    expect(resultado.produtoIds).toHaveLength(8);
  });
  it("recomenda ceramica, exclui compras e preserva vendas, nota, UUID e limite", async () => {
    const response = await request(app)
      .get("/recomendacoes/para-mim")
      .set("Cookie", cookie(comprador));
    expect(response.status).toBe(200);
    expect(response.body.estrategia).toBe("historico-compra");
    expect(response.body.itens.map((item: { id: string }) => item.id)).toEqual([
      candidatos[3],
      candidatos[0],
      candidatos[2],
      candidatos[1],
      ...candidatos.slice(4, 8),
    ]);
    expect(
      response.body.itens.every(
        (item: { categoriaId: string }) => item.categoriaId === ceramica,
      ),
    ).toBe(true);
    expect(response.text).not.toContain(comprado);
    expect(response.text).not.toContain("senhaHash");
    expect(response.text).not.toContain(comprador);
  });

  it("comprador sem pedidos recebe fallback identificado", async () => {
    const response = await request(app)
      .get("/recomendacoes/para-mim")
      .set("Cookie", cookie(semHistorico));
    expect(response.status).toBe(200);
    expect(response.body.estrategia).toBe("fallback-geral");
    expect(response.body.itens[0].id).toBe(geral);
    expect(response.body.itens).toHaveLength(8);
  });

  it("pedidos pendentes e cancelados nao criam historico nem excluem produtos", async () => {
    const novo = await usuario();
    await pedido(novo, geral, 1, "pendente");
    await pedido(novo, comprado, 1, "cancelado");
    const response = await request(app)
      .get("/recomendacoes/para-mim")
      .set("Cookie", cookie(novo));
    expect(response.status).toBe(200);
    expect(response.body.estrategia).toBe("fallback-geral");
    expect(response.body.itens[0].id).toBe(geral);
  });

  it("usa todas as categorias confirmadas e nunca historico alheio", async () => {
    const novo = await usuario();
    await pedido(novo, comprado);
    await pedido(novo, geral);
    const tecidoNovo = await produto(tecido);
    const response = await request(app)
      .get("/recomendacoes/para-mim")
      .set("Cookie", cookie(novo));
    expect(response.status).toBe(200);
    expect(response.body.estrategia).toBe("historico-compra");
    expect(
      response.body.itens.map((item: { id: string }) => item.id),
    ).not.toContain(geral);
    await banco.prisma.produto.updateMany({
      where: { categoriaId: ceramica },
      data: { ativo: false },
    });
    try {
      const fallback = await request(app)
        .get("/recomendacoes/para-mim")
        .set("Cookie", cookie(comprador));
      expect(fallback.body.estrategia).toBe("fallback-geral");
      expect(
        fallback.body.itens.map((item: { id: string }) => item.id),
      ).toEqual([geral, tecidoNovo]);
      const multi = await request(app)
        .get("/recomendacoes/para-mim")
        .set("Cookie", cookie(novo));
      expect(multi.body.estrategia).toBe("historico-compra");
      expect(multi.body.itens.map((item: { id: string }) => item.id)).toEqual([
        tecidoNovo,
      ]);
    } finally {
      await banco.prisma.produto.updateMany({
        where: { id: { in: [comprado, ...candidatos] } },
        data: { ativo: true },
      });
    }
  });

  it("fallback com categoria esgotada nao reintroduz produtos comprados", async () => {
    const unico = await banco.prisma.categoria.create({
      data: { nome: "Unica IA-03" },
    });
    const p = await produto(unico.id);
    const novo = await usuario();
    await pedido(novo, p, 300);
    const response = await request(app)
      .get("/recomendacoes/para-mim")
      .set("Cookie", cookie(novo));
    expect(response.status).toBe(200);
    expect(response.body.estrategia).toBe("fallback-geral");
    expect(
      response.body.itens.map((item: { id: string }) => item.id),
    ).not.toContain(p);
    expect(response.body.itens[0].id).toBe(geral);
  });

  it.each(["anonimo", "artesao", "admin"] as const)(
    "protege acesso como %s",
    async (papel) => {
      const chamada = request(app).get("/recomendacoes/para-mim");
      if (papel !== "anonimo")
        chamada.set(
          "Cookie",
          cookie(papel === "artesao" ? artesao : admin, papel),
        );
      const response = await chamada;
      expect(response.status).toBe(papel === "anonimo" ? 401 : 403);
      expect(response.headers["cache-control"]).toBe("no-store");
    },
  );

  it.each([
    { usuarioId: randomUUID() },
    { produtoId: randomUUID() },
    { extra: "1" },
  ])("recusa contexto na query pessoal: %j", async (query) => {
    const response = await request(app)
      .get("/recomendacoes/para-mim")
      .set("Cookie", cookie(comprador))
      .query(query);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDACAO");
  });

  it("revalida usuario ativo e papel atual apos emitir token", async () => {
    const novo = await usuario();
    const sessao = cookie(novo);
    await banco.prisma.usuario.update({
      where: { id: novo },
      data: { papel: "artesao" },
    });
    expect(
      (await request(app).get("/recomendacoes/para-mim").set("Cookie", sessao))
        .status,
    ).toBe(403);
    await banco.prisma.usuario.update({
      where: { id: novo },
      data: { papel: "comprador", ativo: false },
    });
    expect(
      (await request(app).get("/recomendacoes/para-mim").set("Cookie", sessao))
        .status,
    ).toBe(401);
  });

  it("rejeita token adulterado ou expirado", async () => {
    for (const token of [
      "invalido",
      jwt.sign({ papel: "comprador", nome: "Sintetico" }, secret, {
        subject: comprador,
        expiresIn: -1,
      }),
    ]) {
      const response = await request(app)
        .get("/recomendacoes/para-mim")
        .set("Cookie", `origem_sessao=${token}`);
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("NAO_AUTENTICADO");
    }
  });

  it("nao acessa cache compartilhado e atualiza depois de nova compra", async () => {
    cache.get = async () => {
      throw new Error("Leitura de cache pessoal proibida");
    };
    cache.set = async () => {
      throw new Error("Escrita de cache pessoal proibida");
    };
    const novo = await usuario();
    const primeira = await request(app)
      .get("/recomendacoes/para-mim")
      .set("Cookie", cookie(novo));
    expect(primeira.status).toBe(200);
    expect(primeira.body.estrategia).toBe("fallback-geral");
    await pedido(novo, comprado);
    const segunda = await request(app)
      .get("/recomendacoes/para-mim")
      .set("Cookie", cookie(novo));
    expect(segunda.status).toBe(200);
    expect(segunda.body.estrategia).toBe("historico-compra");
    expect(segunda.headers["cache-control"]).toBe("no-store");
    expect(segunda.headers["x-cache"]).toBeUndefined();
  });
});

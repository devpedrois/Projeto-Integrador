import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createApp } from "../../src/app.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

const secret = "segredo-sintetico-exclusivo-testes-web13";
let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let app: ReturnType<typeof createApp>;
let artesaoId: string;
let adminId: string;
let compradorId: string;
let categoriaId: string;
let produtoId: string;
const logs: Array<{ rota: string; cache: string; duracaoMs: number }> = [];
function cookie(id: string) {
  return `origem_sessao=${jwt.sign({ papel: "artesao", nome: "Sintetico" }, secret, { subject: id, expiresIn: "1h" })}`;
}
function leituras() {
  return [
    `/produtos?artesaoId=${artesaoId}`,
    `/produtos/${produtoId}`,
    `/recomendacoes?produtoId=${produtoId}`,
  ];
}
beforeAll(async () => {
  banco = await criarBancoAuth();
  for (const papel of ["artesao", "admin", "comprador"] as const) {
    const usuario = await banco.prisma.usuario.create({
      data: {
        nome: "Sintetico WEB13",
        email: `${randomUUID()}@teste.origem`,
        senhaHash: "hash-sintetico",
        papel,
        ...(papel === "artesao"
          ? {
              perfilArtesao: {
                create: {
                  tecnicaPrincipalId: "tecnica-modelagem-argila",
                  regiaoId: "regiao-alto-moura-caruaru",
                },
              },
            }
          : {}),
      },
    });
    if (papel === "artesao") artesaoId = usuario.id;
    if (papel === "admin") adminId = usuario.id;
    if (papel === "comprador") compradorId = usuario.id;
  }
  categoriaId = (
    await banco.prisma.categoria.create({ data: { nome: "Categoria WEB13" } })
  ).id;
}, 30000);
beforeEach(async () => {
  await banco.prisma.usuario.update({
    where: { id: artesaoId },
    data: { papel: "artesao", ativo: true },
  });
  produtoId = (
    await banco.prisma.produto.create({
      data: {
        nome: "Vaso WEB13",
        descricao: "Produto sintetico de cache",
        preco: 25.5,
        quantidadeEstoque: 5,
        artesaoId,
        categoriaId,
        tecnicaId: "tecnica-modelagem-argila",
      },
    })
  ).id;
  logs.length = 0;
  app = createApp(
    banco.prisma,
    { JWT_SECRET: secret, COOKIE_SECURE: false, CACHE_TTL_SECONDS: 60 },
    {
      logCache: (registro) => {
        logs.push(registro);
      },
    },
  );
});
afterAll(async () => {
  await banco?.fechar();
});
afterEach(() => {
  vi.useRealTimers();
});
describe("WEB-13 cache HTTP publico", () => {
  it("segunda chamada e HIT com consulta mais rapida e log seguro", async () => {
    for (const rota of leituras()) {
      const miss = await request(app).get(rota);
      const hit = await request(app).get(rota);
      expect(miss.status).toBe(200);
      expect(hit.status).toBe(200);
      expect(miss.headers["x-cache"]).toBe("MISS");
      expect(hit.headers["x-cache"]).toBe("HIT");
      expect(hit.body).toEqual(miss.body);
      const duracao = (response: { headers: Record<string, string> }) =>
        Number(response.headers["server-timing"]?.split("dur=")[1]);
      expect(duracao(hit)).toBeLessThan(duracao(miss));
    }
    expect(logs).toHaveLength(6);
    expect(logs.map((registro) => registro.cache)).toEqual([
      "MISS",
      "HIT",
      "MISS",
      "HIT",
      "MISS",
      "HIT",
    ]);
    expect(
      logs.every(
        (registro) =>
          Number.isFinite(registro.duracaoMs) && registro.duracaoMs >= 0,
      ),
    ).toBe(true);
    expect(JSON.stringify(logs)).not.toContain(produtoId);
    expect(JSON.stringify(logs)).not.toMatch(/senha|cookie|token|usuarioId/);
  });
  it("normaliza query validada, ordem, defaults e UUIDs", async () => {
    const primeiro = await request(app)
      .get("/produtos")
      .query({ termo: "  VASO  ", artesaoId });
    const equivalente = await request(app).get("/produtos").query({
      offset: "00",
      limit: "024",
      artesaoId: artesaoId.toUpperCase(),
      termo: "vaso",
    });
    expect(primeiro.headers["x-cache"]).toBe("MISS");
    expect(equivalente.headers["x-cache"]).toBe("HIT");
    expect(equivalente.body).toEqual(primeiro.body);
    expect(
      (await request(app).get(`/produtos/${produtoId}`)).headers["x-cache"],
    ).toBe("MISS");
    expect(
      (await request(app).get(`/produtos/${produtoId.toUpperCase()}`)).headers[
        "x-cache"
      ],
    ).toBe("HIT");
    expect(
      (
        await request(app)
          .get("/produtos")
          .query({ termo: "vaso", offset: "1", artesaoId })
      ).headers["x-cache"],
    ).toBe("MISS");
  });
  it("nao compartilha recomendacoes por usuario nem cacheia rotas privadas", async () => {
    for (const id of [compradorId, compradorId]) {
      const response = await request(app)
        .get("/recomendacoes/para-mim")
        .set("Cookie", cookie(id));
      expect(response.status).toBe(200);
      expect(response.headers["x-cache"]).toBeUndefined();
      expect(response.headers["cache-control"]).toBe("no-store");
    }
    for (const [rota, id] of [
      ["/artesao/produtos", artesaoId],
      ["/admin/produtos", adminId],
      ["/auth/me", compradorId],
    ] as const) {
      const response = await request(app).get(rota).set("Cookie", cookie(id));
      expect(response.status).toBe(200);
      expect(response.headers["x-cache"]).toBeUndefined();
    }
  });
  it.each([
    "criar",
    "editar",
    "remover",
    "estoque",
    "moderar-produto",
    "moderar-artesao",
    "pedido",
    "perfil",
    "papel",
  ] as const)(
    "%s invalida catalogo e recomendacoes apos commit",
    async (operacao) => {
      for (const rota of leituras()) {
        expect((await request(app).get(rota)).headers["x-cache"]).toBe("MISS");
        expect((await request(app).get(rota)).headers["x-cache"]).toBe("HIT");
      }
      let escrita: request.Response;
      if (operacao === "criar")
        escrita = await request(app)
          .post("/produtos")
          .set("Cookie", cookie(artesaoId))
          .send({
            nome: "Nova peca WEB13",
            descricao: "Peca sintetica de teste",
            preco: 30,
            categoriaId,
            fotos: [{ url: "https://example.test/foto.jpg" }],
            quantidadeEstoque: 3,
          });
      else if (operacao === "editar")
        escrita = await request(app)
          .patch(`/produtos/${produtoId}`)
          .set("Cookie", cookie(artesaoId))
          .send({ nome: "Editado WEB13" });
      else if (operacao === "remover")
        escrita = await request(app)
          .delete(`/produtos/${produtoId}`)
          .set("Cookie", cookie(artesaoId));
      else if (operacao === "estoque")
        escrita = await request(app)
          .patch(`/produtos/${produtoId}/estoque`)
          .set("Cookie", cookie(artesaoId))
          .send({ quantidadeEstoque: 3 });
      else if (operacao === "moderar-produto")
        escrita = await request(app)
          .patch(`/admin/produtos/${produtoId}/moderar`)
          .set("Cookie", cookie(adminId))
          .send({ ativo: false });
      else if (operacao === "moderar-artesao")
        escrita = await request(app)
          .patch(`/admin/artesaos/${artesaoId}/moderar`)
          .set("Cookie", cookie(adminId))
          .send({ ativo: false });
      else if (operacao === "pedido")
        escrita = await request(app)
          .post("/pedidos")
          .set("Cookie", cookie(compradorId))
          .send({ itens: [{ produtoId, quantidade: 1 }] });
      else if (operacao === "perfil")
        escrita = await request(app)
          .patch(`/usuarios/${artesaoId}/perfil-artesao`)
          .set("Cookie", cookie(artesaoId))
          .send({ regiaoId: "regiao-pilar-recife" });
      else
        escrita = await request(app)
          .patch(`/admin/usuarios/${artesaoId}/papel`)
          .set("Cookie", cookie(adminId))
          .send({ papel: "comprador" });
      expect(escrita.status).toBe(
        operacao === "criar" || operacao === "pedido" ? 201 : 200,
      );
      for (const rota of leituras()) {
        const response = await request(app).get(rota);
        if (
          rota === `/produtos/${produtoId}` &&
          ["remover", "moderar-produto", "moderar-artesao", "papel"].includes(
            operacao,
          )
        ) {
          expect(response.status).toBe(404);
          continue;
        }
        expect(response.status).toBe(200);
        expect(response.headers["x-cache"]).toBe("MISS");
        if (operacao === "editar" && rota === `/produtos/${produtoId}`)
          expect(response.body.nome).toBe("Editado WEB13");
        if (operacao === "estoque" && rota === `/produtos/${produtoId}`)
          expect(response.body.quantidadeEstoque).toBe(3);
        if (operacao === "pedido" && rota === `/produtos/${produtoId}`)
          expect(response.body.quantidadeEstoque).toBe(4);
        if (operacao === "perfil" && rota === `/produtos/${produtoId}`)
          expect(response.body.regiaoId).toBe("regiao-pilar-recife");
      }
    },
  );
  it("escrita rejeitada nao invalida dados confirmados", async () => {
    const rota = leituras()[0];
    if (!rota) throw new Error("Rota ausente");
    await request(app).get(rota);
    expect(
      (
        await request(app)
          .patch(`/produtos/${produtoId}/estoque`)
          .set("Cookie", cookie(artesaoId))
          .send({ quantidadeEstoque: -1 })
      ).status,
    ).toBe(400);
    expect((await request(app).get(rota)).headers["x-cache"]).toBe("HIT");
    expect((await request(app).get(`/produtos/${randomUUID()}`)).status).toBe(
      404,
    );
    expect((await request(app).get("/produtos?limit=101")).status).toBe(400);
  });
  it("TTL configurado expira usando relogio fake e banco real", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const agora = Date.now();
    app = createApp(
      banco.prisma,
      { JWT_SECRET: secret, COOKIE_SECURE: false, CACHE_TTL_SECONDS: 1 },
      { logCache: () => {} },
    );
    expect(
      (await request(app).get(`/produtos/${produtoId}`)).headers["x-cache"],
    ).toBe("MISS");
    expect(
      (await request(app).get(`/produtos/${produtoId}`)).headers["x-cache"],
    ).toBe("HIT");
    vi.setSystemTime(agora + 1001);
    expect(
      (await request(app).get(`/produtos/${produtoId}`)).headers["x-cache"],
    ).toBe("MISS");
  });
  it("404 repetido continua MISS e registra duracao sem armazenar erro", async () => {
    const inexistente = randomUUID();
    for (let tentativa = 0; tentativa < 2; tentativa += 1) {
      const response = await request(app).get(`/produtos/${inexistente}`);
      expect(response.status).toBe(404);
      expect(response.headers["x-cache"]).toBe("MISS");
    }
    expect(logs).toHaveLength(2);
    expect(
      logs.every(
        (registro) => registro.cache === "MISS" && registro.duracaoMs >= 0,
      ),
    ).toBe(true);
  });
});

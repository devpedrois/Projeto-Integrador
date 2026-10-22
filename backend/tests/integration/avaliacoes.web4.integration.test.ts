import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

const secret = "segredo-sintetico-web4-apenas-testes";
let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let app: ReturnType<typeof createApp>;
const contas: Record<string, string> = {};
let categoriaId: string;
let comprado: string;
let pendente: string;
let cancelado: string;
let alheio: string;

function conta(nome: string) {
  const id = contas[nome];
  if (!id) throw new Error("Fixture Web.4 ausente");
  return id;
}
function cookie(nome = "comprou") {
  return `origem_sessao=${jwt.sign({ nome: "Conta sintetica", papel: nome === "artesao" ? "artesao" : "comprador" }, secret, { subject: conta(nome), expiresIn: "1h" })}`;
}
async function produto() {
  return banco.prisma.produto.create({
    data: {
      nome: "Peca sintetica Web.4",
      descricao: "Compra verificada",
      preco: 10,
      quantidadeEstoque: 10,
      artesaoId: conta("artesao"),
      categoriaId,
      tecnicaId: "tecnica-modelagem-argila",
    },
  });
}
async function pedido(
  produtoId: string,
  comprador = "comprou",
  status: "confirmado" | "pendente" | "cancelado" = "confirmado",
) {
  return banco.prisma.pedido.create({
    data: {
      compradorId: conta(comprador),
      status,
      total: 10,
      itens: {
        create: { produtoId, quantidade: 1, precoUnitario: 10, subtotal: 10 },
      },
    },
  });
}
function elegibilidade(produtoId: string, comprador = "comprou") {
  return request(app)
    .get(`/avaliacoes/elegibilidade?produtoId=${produtoId}`)
    .set("Cookie", cookie(comprador));
}
function avaliar(produtoId: string, comprador = "comprou") {
  return request(app)
    .post("/avaliacoes")
    .set("Cookie", cookie(comprador))
    .send({ produtoId, nota: 5 });
}

beforeAll(async () => {
  banco = await criarBancoAuth();
  app = createApp(
    banco.prisma,
    { JWT_SECRET: secret, COOKIE_SECURE: false },
    { logCache: () => {} },
  );
  for (const nome of ["comprou", "naoComprou", "artesao"]) {
    const registro = await banco.prisma.usuario.create({
      data: {
        nome: "Conta sintetica Web.4",
        email: `${randomUUID()}@teste.origem`,
        senhaHash: "hash-sintetico",
        papel: nome === "artesao" ? "artesao" : "comprador",
      },
    });
    contas[nome] = registro.id;
  }
  categoriaId = (
    await banco.prisma.categoria.create({ data: { nome: "Web.4" } })
  ).id;
  comprado = (await produto()).id;
  pendente = (await produto()).id;
  cancelado = (await produto()).id;
  alheio = (await produto()).id;
  await pedido(comprado);
  await pedido(pendente, "comprou", "pendente");
  await pedido(cancelado, "comprou", "cancelado");
  await pedido(alheio, "naoComprou");
}, 40_000);
afterAll(async () => {
  await banco?.fechar();
});

describe("Web.4 compra verificada em PostgreSQL real", () => {
  it("permite somente ao comprador com pedido confirmado e depois informa ja avaliado", async () => {
    const antes = await elegibilidade(comprado.toUpperCase());
    expect(antes.status).toBe(200);
    expect(antes.body).toEqual({ podeAvaliar: true, motivo: null });
    expect(antes.headers["cache-control"]).toBe("no-store");
    const criada = await avaliar(comprado);
    expect(criada.status).toBe(201);
    expect(criada.body.compradorId).toBe(conta("comprou"));
    expect((await elegibilidade(comprado)).body).toEqual({
      podeAvaliar: false,
      motivo: "ja_avaliou",
    });
    const duplicada = await avaliar(comprado);
    expect(duplicada.status).toBe(409);
    expect(duplicada.body.error.code).toBe("AVALIACAO_DUPLICADA");
  });

  it("nao comprou recebe 403 estavel, sem gravacao ou invalidacao de cache", async () => {
    const rota = `/produtos/${comprado}`;
    await request(app).get(rota);
    expect((await request(app).get(rota)).headers["x-cache"]).toBe("HIT");
    const resposta = await avaliar(comprado, "naoComprou");
    expect(resposta.status).toBe(403);
    expect(resposta.body.error.code).toBe("COMPRA_NAO_VERIFICADA");
    expect((await elegibilidade(comprado, "naoComprou")).body).toEqual({
      podeAvaliar: false,
      motivo: "nao_comprou",
    });
    expect(
      await banco.prisma.avaliacao.count({
        where: { compradorId: conta("naoComprou"), produtoId: comprado },
      }),
    ).toBe(0);
    expect((await request(app).get(rota)).headers["x-cache"]).toBe("HIT");
  });

  it.each(["pendente", "cancelado", "alheio"])(
    "nao autoriza pedido %s",
    async (tipo) => {
      const produtoId =
        tipo === "pendente"
          ? pendente
          : tipo === "cancelado"
            ? cancelado
            : alheio;
      expect((await elegibilidade(produtoId)).body).toEqual({
        podeAvaliar: false,
        motivo: "nao_comprou",
      });
      const resposta = await avaliar(produtoId);
      expect(resposta.status).toBe(403);
      expect(resposta.body.error.code).toBe("COMPRA_NAO_VERIFICADA");
      expect(
        await banco.prisma.avaliacao.count({
          where: { compradorId: conta("comprou"), produtoId },
        }),
      ).toBe(0);
    },
  );

  it("revalida a compra no POST mesmo apos elegibilidade positiva", async () => {
    const alvo = await produto();
    const compra = await pedido(alvo.id);
    expect((await elegibilidade(alvo.id)).body).toEqual({
      podeAvaliar: true,
      motivo: null,
    });
    await banco.prisma.pedido.update({
      where: { id: compra.id },
      data: { status: "cancelado" },
    });
    expect((await avaliar(alvo.id)).status).toBe(403);
    expect(
      await banco.prisma.avaliacao.count({ where: { produtoId: alvo.id } }),
    ).toBe(0);
  });

  it("produto inexistente e avaliacao legada sem compra nao concedem permissao", async () => {
    const inexistente = randomUUID();
    expect((await elegibilidade(inexistente)).body).toEqual({
      podeAvaliar: false,
      motivo: "nao_comprou",
    });
    expect((await avaliar(inexistente)).status).toBe(403);
    const legado = await produto();
    await banco.prisma.avaliacao.create({
      data: { produtoId: legado.id, compradorId: conta("naoComprou"), nota: 3 },
    });
    expect((await elegibilidade(legado.id, "naoComprou")).body).toEqual({
      podeAvaliar: false,
      motivo: "nao_comprou",
    });
    expect((await avaliar(legado.id, "naoComprou")).status).toBe(403);
  });

  it.each(["post", "get"] as const)(
    "%s exige sessao e papel comprador",
    async (metodo) => {
      const path =
        metodo === "post"
          ? "/avaliacoes"
          : `/avaliacoes/elegibilidade?produtoId=${comprado}`;
      const requisitar = () =>
        metodo === "post"
          ? request(app).post(path).send({ produtoId: comprado, nota: 5 })
          : request(app).get(path);
      expect((await requisitar()).status).toBe(401);
      expect((await requisitar().set("Cookie", cookie("artesao"))).status).toBe(
        403,
      );
    },
  );

  it.each([
    "",
    "produtoId=invalido",
    "produtoId=a&produtoId=b",
    "produtoId=00000000-0000-4000-8000-000000000000&compradorId=outro",
  ])("rejeita query invalida: %s", async (query) => {
    const response = await request(app)
      .get(`/avaliacoes/elegibilidade?${query}`)
      .set("Cookie", cookie());
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDACAO");
    expect(response.text).not.toMatch(/Prisma|SELECT|stack/i);
  });

  it("mantem os locks de autorizacao na transacao que insere", async () => {
    const alvo = await produto();
    await pedido(alvo.id);
    await banco.prisma.$executeRawUnsafe(`
      CREATE FUNCTION verificar_transacao_web4() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_locks
          WHERE pid = pg_backend_pid() AND relation = '"Pedido"'::regclass
            AND mode = 'RowShareLock' AND granted
        ) THEN
          RAISE EXCEPTION 'Autorizacao nao preservada na transacao de escrita';
        END IF;
        RETURN NEW;
      END; $$
    `);
    await banco.prisma.$executeRawUnsafe(
      `CREATE TRIGGER validar_transacao_web4 BEFORE INSERT ON "Avaliacao" FOR EACH ROW EXECUTE FUNCTION verificar_transacao_web4()`,
    );
    try {
      expect((await avaliar(alvo.id)).status).toBe(201);
    } finally {
      await banco.prisma.$executeRawUnsafe(
        `DROP TRIGGER validar_transacao_web4 ON "Avaliacao"`,
      );
    }
  });
});

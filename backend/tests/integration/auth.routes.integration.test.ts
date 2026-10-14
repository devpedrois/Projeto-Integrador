import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import { gerarHash, compararSenha } from "../../src/utils/senha.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

const secret = "segredo-sintetico-exclusivo-testes-web03";
const environment = { JWT_SECRET: secret, COOKIE_SECURE: false };
const senha = "SenhaSintetica123!";
let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let app: ReturnType<typeof createApp>;
let usuario: { id: string; nome: string; email: string; papel: "comprador" };
let inativoEmail: string;

function cadastro(papel: "comprador" | "artesao" = "comprador") {
  return {
    nome: "Usuario sintetico",
    email: `${randomUUID()}@teste.origem`,
    senha,
    papel,
  };
}

function primeiroCookie(headers: Record<string, unknown>): string {
  const cookies = headers["set-cookie"];
  expect(Array.isArray(cookies)).toBe(true);
  const cookie: unknown = Array.isArray(cookies) ? cookies[0] : undefined;
  expect(typeof cookie).toBe("string");
  return String(cookie);
}

beforeAll(async () => {
  banco = await criarBancoAuth();
  app = createApp(banco.prisma, environment);
  const senhaHash = await gerarHash(senha);
  usuario = (await banco.prisma.usuario.create({
    data: {
      nome: "Comprador sintetico",
      email: `${randomUUID()}@teste.origem`,
      senhaHash,
    },
    select: { id: true, nome: true, email: true, papel: true },
  })) as typeof usuario;
  inativoEmail = `${randomUUID()}@teste.origem`;
  await banco.prisma.usuario.create({
    data: {
      nome: "Usuario inativo",
      email: inativoEmail,
      senhaHash,
      ativo: false,
    },
  });
}, 30_000);

afterAll(async () => {
  await banco?.fechar();
});

describe("POST /auth/register", () => {
  it("normaliza email, persiste bcrypt custo 10 e cria carrinho sem iniciar sessao", async () => {
    const input = cadastro();
    const agent = request.agent(app);
    const response = await agent.post("/auth/register").send({
      ...input,
      nome: "  Comprador sintetico  ",
      email: ` ${input.email.toUpperCase()} `,
    });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: expect.any(String),
      nome: "Comprador sintetico",
      email: input.email,
      papel: "comprador",
    });
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect((await agent.get("/auth/me")).status).toBe(401);
    const salvo = await banco.prisma.usuario.findUniqueOrThrow({
      where: { email: input.email },
      include: { carrinho: true, perfilArtesao: true },
    });
    expect(salvo.senhaHash).toMatch(/^\$2b\$10\$/);
    expect(await compararSenha(senha, salvo.senhaHash)).toBe(true);
    expect(salvo.carrinho?.usuarioId).toBe(salvo.id);
    expect(salvo.perfilArtesao).toBeNull();
  });

  it("cria perfil de artesao incompleto", async () => {
    const input = cadastro("artesao");
    const response = await request(app).post("/auth/register").send(input);
    expect(response.status).toBe(201);
    expect(Object.keys(response.body).sort()).toEqual([
      "email",
      "id",
      "nome",
      "papel",
    ]);
    const salvo = await banco.prisma.usuario.findUniqueOrThrow({
      where: { email: input.email },
      include: { carrinho: true, perfilArtesao: true },
    });
    expect(salvo.carrinho).toBeNull();
    expect(salvo.perfilArtesao).toEqual({
      usuarioId: salvo.id,
      completo: false,
      historia: null,
      tecnicaPrincipalId: null,
      regiaoId: null,
      foto: null,
    });
  });

  it.each([
    { papel: "admin" },
    { papel: "outro" },
    { nome: "ab" },
    { email: "email-invalido" },
    { senha: "curta" },
    { senha: "a".repeat(73) },
    { senha: "é".repeat(37) },
    { ativo: true },
    { senhaHash: "hash-injetado" },
  ])("rejeita entrada invalida ou campos extras: %j", async (alteracao) => {
    const input = { ...cadastro(), ...alteracao };
    const response = await request(app).post("/auth/register").send(input);
    expect(response.status).toBe(400);
    expect(response.text).not.toContain("senhaHash");
    expect(
      await banco.prisma.usuario.count({ where: { email: input.email } }),
    ).toBe(0);
  });

  it("retorna 409 para email em uso com caixa e espacos distintos", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({
        ...cadastro(),
        email: ` ${usuario.email.toUpperCase()} `,
      });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("EMAIL_JA_CADASTRADO");
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("mantem unicidade em cadastros simultaneos", async () => {
    const input = cadastro();
    const responses = await Promise.all([
      request(app).post("/auth/register").send(input),
      request(app)
        .post("/auth/register")
        .send({ ...input, email: input.email.toUpperCase() }),
    ]);
    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(
      await banco.prisma.usuario.count({ where: { email: input.email } }),
    ).toBe(1);
  });

  it.each(["comprador", "artesao"] as const)(
    "reverte Usuario se o segundo insert falhar para %s",
    async (papel) => {
      const input = { ...cadastro(papel), nome: "Falha transacional" };
      const response = await request(app).post("/auth/register").send(input);
      expect(response.status).toBe(503);
      expect(response.text).not.toContain("Falha sintetica");
      expect(
        await banco.prisma.usuario.count({ where: { email: input.email } }),
      ).toBe(0);
      const recuperacao = await request(app)
        .post("/auth/register")
        .send({ ...input, nome: "Recuperacao" });
      expect(recuperacao.status).toBe(201);
    },
  );
});

describe("POST /auth/login", () => {
  it.each([false, true])(
    "emite JWT de 24h e cookie seguro conforme COOKIE_SECURE=%s",
    async (secure) => {
      const response = await request(
        createApp(banco.prisma, { ...environment, COOKIE_SECURE: secure }),
      )
        .post("/auth/login")
        .send({ email: ` ${usuario.email.toUpperCase()} `, senha });
      expect(response.status).toBe(200);
      expect(response.body).toEqual(usuario);
      const cookie = primeiroCookie(response.headers);
      expect(cookie).toContain("origem_sessao=");
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=Lax");
      expect(cookie).toContain("Path=/");
      expect(cookie).toContain("Max-Age=86400");
      expect(cookie.includes("Secure")).toBe(secure);
      expect(cookie).not.toContain("Domain=");
      expect(response.headers["cache-control"]).toBe("no-store");
      const token = cookie.split(";")[0]?.split("=")[1];
      expect(token).toBeDefined();
      const payload = jwt.verify(String(token), secret, {
        algorithms: ["HS256"],
      });
      expect(payload).toMatchObject({
        sub: usuario.id,
        papel: "comprador",
        nome: usuario.nome,
      });
      if (typeof payload === "string") throw new Error("Payload invalido");
      expect(Number(payload.exp) - Number(payload.iat)).toBe(86_400);
      expect(payload).not.toHaveProperty("senhaHash");
      expect(payload).not.toHaveProperty("email");
    },
  );

  it("retorna status e corpo byte a byte iguais nos tres logins invalidos", async () => {
    const responses = await Promise.all([
      request(app)
        .post("/auth/login")
        .send({ email: `${randomUUID()}@teste.origem`, senha }),
      request(app)
        .post("/auth/login")
        .send({ email: usuario.email, senha: "SenhaErrada123!" }),
      request(app).post("/auth/login").send({ email: inativoEmail, senha }),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(401);
      expect(response.text).toBe(responses[0]?.text);
      expect(response.body).toEqual({
        error: {
          code: "CREDENCIAIS_INVALIDAS",
          message: "Email ou senha invalidos.",
        },
      });
      expect(response.headers["set-cookie"]).toBeUndefined();
    }
  });

  it("executa bcrypt real contra o mesmo hash fixo para email inexistente", async () => {
    const compare = vi.spyOn(bcrypt, "compare");
    try {
      for (let tentativa = 0; tentativa < 2; tentativa += 1) {
        const response = await request(app)
          .post("/auth/login")
          .send({ email: `${randomUUID()}@teste.origem`, senha });
        expect(response.status).toBe(401);
      }
      expect(compare).toHaveBeenCalledTimes(2);
      expect(compare.mock.calls[0]?.[1]).toMatch(/^\$2b\$10\$/);
      expect(compare.mock.calls[0]?.[1]).toBe(compare.mock.calls[1]?.[1]);
    } finally {
      compare.mockRestore();
    }
  });

  it.each([
    { email: "invalido" },
    { senha: "" },
    { senha: "a".repeat(73) },
    { papel: "admin" },
  ])("valida o login na borda: %j", async (alteracao) => {
    const response = await request(app)
      .post("/auth/login")
      .send({ email: usuario.email, senha, ...alteracao });
    expect(response.status).toBe(400);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it.each(["register", "login"])(
    "retorna 400 para JSON malformado em /auth/%s",
    async (rota) => {
      const response = await request(app)
        .post(`/auth/${rota}`)
        .set("Content-Type", "application/json")
        .send('{"senha":"segredo-sintetico",');
      expect(response.status).toBe(400);
      expect(response.text).not.toContain("segredo-sintetico");
      expect(response.text).not.toContain("SyntaxError");
    },
  );

  it("recusa emitir sessao sem JWT_SECRET configurado", async () => {
    const response = await request(
      createApp(banco.prisma, { COOKIE_SECURE: false }),
    )
      .post("/auth/login")
      .send({ email: usuario.email, senha });
    expect(response.status).toBe(503);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });
});

describe("GET /auth/me e POST /auth/logout", () => {
  it("retorna somente usuario publico e encerra sessao no logout", async () => {
    const agent = request.agent(app);
    expect((await agent.get("/auth/me")).status).toBe(401);
    expect(
      (await agent.post("/auth/login").send({ email: usuario.email, senha }))
        .status,
    ).toBe(200);
    const me = await agent.get("/auth/me");
    expect(me.status).toBe(200);
    expect(me.body).toEqual(usuario);
    expect(me.headers["cache-control"]).toBe("no-store");
    const logout = await agent.post("/auth/logout");
    expect(logout.status).toBe(204);
    expect(logout.text).toBe("");
    const cookie = primeiroCookie(logout.headers);
    expect(cookie).toContain("origem_sessao=;");
    expect(cookie).toContain("Expires=Thu, 01 Jan 1970");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect((await agent.get("/auth/me")).status).toBe(401);
    expect((await agent.post("/auth/logout")).status).toBe(204);
  });

  it.each([
    "invalido",
    "%E0%A4%A",
    jwt.sign(
      { sub: randomUUID(), papel: "comprador", nome: "Sintetico" },
      secret,
      { expiresIn: -1 },
    ),
    jwt.sign(
      { sub: randomUUID(), papel: "comprador", nome: "Sintetico" },
      "outro-segredo-sintetico",
      { expiresIn: "24h" },
    ),
    jwt.sign({ sub: "nao-e-uuid", papel: "admin", nome: "Sintetico" }, secret, {
      expiresIn: "24h",
    }),
    jwt.sign(
      { sub: randomUUID(), papel: "comprador", nome: "Sintetico" },
      secret,
      { algorithm: "HS384", expiresIn: "24h" },
    ),
    jwt.sign(
      { sub: randomUUID(), papel: "comprador", nome: "Sintetico" },
      secret,
      { expiresIn: "24h" },
    ),
  ])(
    "rejeita sessao invalida, expirada ou de usuario ausente: %#",
    async (token) => {
      const response = await request(app)
        .get("/auth/me")
        .set("Cookie", `origem_sessao=${token}`);
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: {
          code: "NAO_AUTENTICADO",
          message: "Sessao invalida ou ausente.",
        },
      });
    },
  );

  it("reconsulta o usuario e recusa sessao de usuario desativado", async () => {
    const input = cadastro();
    await request(app).post("/auth/register").send(input).expect(201);
    const agent = request.agent(app);
    await agent
      .post("/auth/login")
      .send({ email: input.email, senha })
      .expect(200);
    await banco.prisma.usuario.update({
      where: { email: input.email },
      data: { ativo: false },
    });
    expect((await agent.get("/auth/me")).status).toBe(401);
  });

  it("remove definitivamente o probe temporario", async () => {
    const response = await request(app).get("/health/cookie");
    expect(response.status).toBe(404);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });
});

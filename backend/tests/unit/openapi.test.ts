import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { createPrismaClient } from "../../src/database/prisma/client.js";
import { registry } from "../../src/docs/openapi.js";
import { z } from "zod";

const prisma = createPrismaClient(
  "postgresql://synthetic:synthetic@127.0.0.1:5432/unused",
);
const app = createApp(prisma);
afterAll(() => prisma.$disconnect());

interface Layer {
  route?: { path: string; methods: Record<string, boolean> };
  handle?: { stack?: Layer[] };
}

function registeredOperations(stack: Layer[]): string[] {
  return stack.flatMap((layer) => {
    if (!layer.route) return registeredOperations(layer.handle?.stack ?? []);
    const path = layer.route.path.replace(/:([\w]+)/g, "{$1}");
    return Object.keys(layer.route.methods).map(
      (method) => `${method} ${path}`,
    );
  });
}

interface Operation {
  operationId: string;
  summary: string;
  responses: Record<
    string,
    { content?: Record<string, { example?: unknown; schema?: unknown }> }
  >;
  security: unknown[];
}
interface Document {
  paths: Record<string, Record<string, Operation>>;
}
function documentedOperations(document: Document): string[] {
  return Object.entries(document.paths).flatMap(([path, operations]) =>
    Object.keys(operations).map((method) => `${method} ${path}`),
  );
}

describe("WEB-15 OpenAPI", () => {
  it("documenta pedidos recebidos sem total financeiro ou dados privados", async () => {
    const response = await request(app).get("/docs/openapi.json");
    const operation = response.body.paths["/artesao/pedidos"]?.get;
    expect(operation).toBeDefined();
    expect(operation.security).toEqual([{ sessao: [] }]);
    expect(operation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "limit",
          schema: expect.objectContaining({ default: "10" }),
        }),
        expect.objectContaining({
          name: "offset",
          schema: expect.objectContaining({ default: "0" }),
        }),
      ]),
    );
    for (const status of ["400", "401", "403"]) {
      expect(operation.responses).toHaveProperty(status);
    }
    const example =
      operation.responses["200"].content["application/json"].example;
    expect(example).toMatchObject({
      limit: 10,
      offset: 0,
      total: 1,
      itens: [
        expect.objectContaining({
          nomeComprador: expect.any(String),
          subtotalArtesao: expect.any(Number),
        }),
      ],
    });
    expect(Object.keys(example.itens[0]).sort()).toEqual([
      "criadoEm",
      "id",
      "itens",
      "nomeComprador",
      "numero",
      "subtotalArtesao",
    ]);
  });

  it("documenta exemplo de recomendações e respostas 400/404", async () => {
    const response = await request(app).get("/docs/openapi.json");
    expect(response.status).toBe(200);
    const operation = response.body.paths["/recomendacoes"].get;
    expect(
      operation.responses["200"].content["application/json"].example,
    ).toMatchObject({ estrategia: "categoria", itens: [expect.any(Object)] });
    for (const status of ["400", "404"]) {
      expect(
        operation.responses[status]?.content["application/json"],
      ).toMatchObject({
        schema: expect.any(Object),
        example: {
          error: { code: expect.any(String), message: expect.any(String) },
        },
      });
    }
    expect(operation.description).toContain("fallback geral");
  });

  it("preserva restrições e defaults válidos dos validators", async () => {
    const response = await request(app).get("/docs/openapi.json");
    const schemas = response.body.components.schemas;
    expect(schemas.CadastroInput.properties.senha).toMatchObject({
      minLength: 8,
      maxLength: 72,
      writeOnly: true,
    });
    expect(schemas.CadastroInput.properties.email).toMatchObject({
      format: "email",
      maxLength: 254,
    });
    const query = response.body.paths["/produtos"].get.parameters as {
      name: string;
      schema: { default?: unknown };
    }[];
    expect(
      query.find((parameter) => parameter.name === "limit")?.schema.default,
    ).toBe("24");
    expect(
      query.find((parameter) => parameter.name === "offset")?.schema.default,
    ).toBe("0");
    expect(
      response.body.paths["/auth/register"].post.responses["409"].content[
        "application/json"
      ].example.error.code,
    ).toBe("EMAIL_JA_CADASTRADO");
  });

  it("mantém exemplos compatíveis com os schemas reais", () => {
    for (const definition of registry.definitions) {
      if (definition.type !== "route") continue;
      const { request: input, responses } = definition.route;
      const contents = [
        input?.body?.content,
        ...Object.values(responses).map((response) =>
          "content" in response ? response.content : undefined,
        ),
      ];
      for (const content of contents) {
        const media = content?.["application/json"];
        if (media && "schema" in media && media.schema instanceof z.ZodType) {
          expect(
            media.schema.safeParse(media.example).success,
            `${definition.route.method} ${definition.route.path}`,
          ).toBe(true);
        }
      }
    }
  });
  it("publica o documento com cookie de sessão e servidor relativo", async () => {
    const response = await request(app).get("/docs/openapi.json");
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body).toMatchObject({
      openapi: "3.1.0",
      servers: [{ url: "/" }],
      components: {
        securitySchemes: {
          sessao: { type: "apiKey", in: "cookie", name: "origem_sessao" },
        },
      },
    });
  });

  it("cobre cada método e path realmente registrado no Express", async () => {
    const response = await request(app).get("/docs/openapi.json");
    expect(response.status).toBe(200);
    const registered = registeredOperations(
      app.router.stack as unknown as Layer[],
    );
    expect(registered).toContain("patch /artesao/notificacoes/{id}/lida");
    expect(registered).toContain("post /auth/logout");
    expect(documentedOperations(response.body).sort()).toEqual(
      registered.sort(),
    );
  });

  it("detecta novas rotas e novos métodos ausentes no documento", async () => {
    const changed = createApp(prisma);
    changed.get("/rota-sem-documentacao", (_req, res) => res.end());
    changed.put("/produtos/:id", (_req, res) => res.end());
    const response = await request(changed).get("/docs/openapi.json");
    expect(response.status).toBe(200);
    const documented = documentedOperations(response.body);
    expect(
      registeredOperations(changed.router.stack as unknown as Layer[]).filter(
        (key) => !documented.includes(key),
      ),
    ).toEqual(["get /rota-sem-documentacao", "put /produtos/{id}"]);
  });

  it("serve Swagger com assets locais e CSP permitindo scripts locais", async () => {
    const response = await request(app).get("/docs").redirects(1);
    expect(response.status).toBe(200);
    expect(response.text).toContain("swagger-ui");
    expect(response.headers["content-security-policy"]).toContain(
      "script-src 'self'",
    );
    expect(response.headers["content-security-policy"]).not.toContain(
      "upgrade-insecure-requests",
    );
    for (const asset of [
      "swagger-ui-init.js",
      "swagger-ui-bundle.js",
      "swagger-ui.css",
    ]) {
      const result = await request(app).get(`/docs/${asset}`);
      expect(result.status).toBe(200);
      expect(result.headers["x-content-type-options"]).toBe("nosniff");
    }
    const init = await request(app).get("/docs/swagger-ui-init.js");
    expect(init.text).toContain("/docs/openapi.json");
    const missing = await request(app).get("/docs/inexistente");
    expect(missing.status).toBe(404);
    const elsewhere = await request(app).post("/auth/logout");
    expect(elsewhere.headers["content-security-policy"]).toContain(
      "upgrade-insecure-requests",
    );
  });

  it("inclui exemplos, schemas, segurança e erros aplicáveis", async () => {
    const response = await request(app).get("/docs/openapi.json");
    expect(response.status).toBe(200);
    const document = response.body as Document;
    const ids: string[] = [];
    for (const operations of Object.values(document.paths)) {
      for (const operation of Object.values(operations)) {
        expect(operation.summary).toBeTruthy();
        expect(operation.operationId).toBeTruthy();
        ids.push(operation.operationId);
        for (const content of Object.values(operation.responses)) {
          if (content.content?.["application/json"]) {
            expect(content.content["application/json"].example).toBeDefined();
            expect(content.content["application/json"].schema).toBeDefined();
          }
        }
        if (operation.security.length) {
          expect(operation.responses).toHaveProperty("401");
        }
      }
    }
    expect(new Set(ids).size).toBe(ids.length);
    for (const code of ["400", "401", "403", "404", "409"]) {
      expect(
        document.paths["/carrinho/itens/{produtoId}"]?.patch?.responses,
      ).toHaveProperty(code);
    }
    expect(document.paths["/auth/register"]?.post?.responses).toHaveProperty(
      "409",
    );
    expect(document.paths["/auth/logout"]?.post?.security).toEqual([]);
    expect(document.paths["/recomendacoes/para-mim"]?.get?.security).toEqual([
      { sessao: [] },
    ]);
  });
});

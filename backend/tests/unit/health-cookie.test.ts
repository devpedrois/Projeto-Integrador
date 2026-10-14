import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { createPrismaClient } from "../../src/database/prisma/client.js";

const prisma = createPrismaClient(
  "postgresql://synthetic:synthetic@127.0.0.1:5432/unused",
);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /health/cookie removido", () => {
  it("não registra a rota por padrão", async () => {
    const response = await request(createApp(prisma)).get("/health/cookie");

    expect(response.status).toBe(404);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("não permite habilitar a rota pela query ou pelo cookie", async () => {
    const legacy = { ENABLE_COOKIE_PROBE: false, COOKIE_SECURE: false };
    const app = createApp(prisma, legacy);
    const response = await request(app)
      .get("/health/cookie?ENABLE_COOKIE_PROBE=true")
      .set("Cookie", "origem_cookie_probe=ok");

    expect(response.status).toBe(404);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it.each([true, false])(
    "remove o probe mesmo com a antiga configuracao e COOKIE_SECURE=%s",
    async (secure) => {
      const legacy = { ENABLE_COOKIE_PROBE: true, COOKIE_SECURE: secure };
      const app = createApp(prisma, legacy);
      const response = await request(app).get("/health/cookie");

      expect(response.status).toBe(404);
      expect(response.headers["set-cookie"]).toBeUndefined();
    },
  );

  it("também não registra POST para o antigo probe", async () => {
    const legacy = { ENABLE_COOKIE_PROBE: true, COOKIE_SECURE: true };
    const app = createApp(prisma, legacy);
    const response = await request(app).post("/health/cookie");

    expect(response.status).toBe(404);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });
});

import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { createPrismaClient } from "../../src/database/prisma/client.js";

const prisma = createPrismaClient("postgresql://synthetic:synthetic@127.0.0.1:5432/unused");

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /health/cookie temporário", () => {
  it("não registra a rota por padrão", async () => {
    const response = await request(createApp(prisma)).get("/health/cookie");

    expect(response.status).toBe(404);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("não permite habilitar a rota pela query ou pelo cookie", async () => {
    const app = createApp(prisma, { ENABLE_COOKIE_PROBE: false, COOKIE_SECURE: false });
    const response = await request(app)
      .get("/health/cookie?ENABLE_COOKIE_PROBE=true")
      .set("Cookie", "origem_cookie_probe=ok");

    expect(response.status).toBe(404);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it.each([true, false])("emite o cookie com COOKIE_SECURE=%s", async (secure) => {
    const app = createApp(prisma, { ENABLE_COOKIE_PROBE: true, COOKIE_SECURE: secure });
    const response = await request(app).get("/health/cookie");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", cookie: "origem_cookie_probe" });
    const cookies = response.headers["set-cookie"] as string[] | undefined;
    expect(cookies).toHaveLength(1);
    const cookie = cookies?.[0];
    expect(cookie).toContain("origem_cookie_probe=ok");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=300");
    expect(cookie?.includes("Secure")).toBe(secure);
    expect(cookie).not.toContain("Domain=");
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("mantém somente GET disponível para o probe", async () => {
    const app = createApp(prisma, { ENABLE_COOKIE_PROBE: true, COOKIE_SECURE: true });
    const response = await request(app).post("/health/cookie");

    expect(response.status).toBe(404);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });
});

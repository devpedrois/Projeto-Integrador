import "dotenv/config";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { createPrismaClient } from "../../src/database/prisma/client.js";

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error("DATABASE_URL is required for integration tests");
}

const prisma = createPrismaClient(databaseUrl);
const app = createApp(prisma);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /health", () => {
  it.each(["/health", "/recomendacoes", "/missing-route"])(
    "sets security headers on %s without advertising Express",
    async (path) => {
      const response = await request(app).get(path);

      expect(response.headers["x-powered-by"]).toBeUndefined();
      expect(response.headers["x-content-type-options"]).toBe("nosniff");
      expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
      expect(response.headers["content-security-policy"]).toContain(
        response.status === 404 ? "default-src 'none'" : "default-src 'self'",
      );
      expect(response.headers["strict-transport-security"]).toContain("max-age=");
    },
  );

  it("confirms access to the real PostgreSQL database", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      database: "reachable",
    });
  });
});

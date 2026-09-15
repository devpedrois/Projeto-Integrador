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
  it("confirms access to the real PostgreSQL database", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      database: "reachable",
    });
  });
});

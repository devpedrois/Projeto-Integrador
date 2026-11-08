import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import request from "supertest";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";

const pool = new Pool();
const app = createApp(pool, {
  API_SCHEMA: "public",
  RECOMENDACAO_SERVICE_TOKEN: "synthetic-service-token-with-32-characters",
});
afterAll(async () => {
  await pool.end();
});
afterEach(() => {
  vi.restoreAllMocks();
});

it.each([undefined, "email@teste.test", randomUUID()])(
  "correlaciona rejeicao de token sem expor dados: %s",
  async (recebido) => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const call = request(app)
      .get("/recomendacoes?email=email@teste.test&token=confidencial")
      .set("X-Service-Token", "token-confidencial")
      .set("Cookie", "cookie-confidencial");
    if (recebido) call.set("X-Request-Id", recebido);
    const response = await call;
    expect(response.status).toBe(401);
    const id = response.headers["x-request-id"] as string;
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    if (recebido && !recebido.includes("@")) expect(id).toBe(recebido);
    expect(log.mock.calls).toHaveLength(1);
    const registro = JSON.parse(String(log.mock.calls[0]?.[0])) as Record<
      string,
      unknown
    >;
    expect(registro).toMatchObject({
      servico: "recomendacao",
      requestId: id,
      metodo: "GET",
      status: 401,
    });
    expect(registro.duracaoMs).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(registro)).not.toMatch(/confidencial|@|\?/);
  },
);

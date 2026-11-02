// @vitest-environment node
import { createServer, type Server } from "node:http";
import { resolve } from "node:path";
import next from "next";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import nextConfig from "../../next.config";

let backend: Server;
let frontend: Server;
let application: ReturnType<typeof next>;
let origin: string;

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Porta indisponivel");
  return `http://127.0.0.1:${address.port}`;
}

beforeAll(async () => {
  backend = createServer((request, response) => {
    response.statusCode = request.url === "/docs/" ? 200 : 404;
    response.end("Swagger local");
  });
  const backendOrigin = await listen(backend);
  vi.stubEnv("BACKEND_URL", backendOrigin);
  application = next({
    dev: true,
    dir: resolve("."),
    conf: nextConfig,
  });
  await application.prepare();
  frontend = createServer(application.getRequestHandler());
  origin = await listen(frontend);
}, 60000);

afterAll(async () => {
  for (const server of [frontend, backend]) {
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  }
  await application?.close();
  vi.unstubAllEnvs();
}, 30000);

it("encaminha a barra final do Swagger sem redirecionamento circular", async () => {
  const response = await fetch(`${origin}/api/docs/`, { redirect: "manual" });
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("Swagger local");
});

it("canonicaliza o endereco publico sem barra antes do rewrite", async () => {
  const response = await fetch(`${origin}/api/docs`, { redirect: "manual" });
  expect(response.status).toBe(308);
  const target = new URL(response.headers.get("location") ?? "", origin);
  expect(target.pathname).toBe("/api/docs/");
  const page = await fetch(target, { redirect: "manual" });
  expect(page.status).toBe(200);
  expect(await page.text()).toBe("Swagger local");
});

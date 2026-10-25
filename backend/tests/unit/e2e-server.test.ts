import { existsSync } from "node:fs";
import { expect, it } from "vitest";

async function script() {
  const url = new URL("../../scripts/e2e-server.ts", import.meta.url);
  expect(existsSync(url), "Entrypoint E2E ausente").toBe(true);
  return import("../../scripts/e2e-server.js");
}

it("31.3 recusa ambiente inseguro antes de abrir conexao", async () => {
  const { validateE2EEnvironment } = await script();
  for (const env of [
    {},
    { E2E_DATABASE_URL: "https://example.com" },
    {
      E2E_DATABASE_URL: "postgresql://teste:segredo@teste.example/db",
      NODE_ENV: "production",
    },
    {
      E2E_DATABASE_URL: "postgresql://teste:segredo@teste.example/db",
      DIRECT_URL: "postgresql://outra:senha@teste-pooler.example/db",
    },
    {
      E2E_DATABASE_URL: "postgresql://teste:segredo@teste.example/db",
      DATABASE_URL_DEPLOY: "postgresql://outra:senha@teste.example/db",
    },
    {
      E2E_DATABASE_URL: "postgresql://teste:segredo@teste.example/db",
      E2E_API_PORT: "0",
    },
    {
      E2E_DATABASE_URL: "postgresql://teste:segredo@teste.example/db",
      E2E_API_PORT: "3313;cmd",
    },
  ])
    expect(() => validateE2EEnvironment(env)).toThrow();
});

it("31.3 usa conexao direta da branch de teste e porta local", async () => {
  const { validateE2EEnvironment } = await script();
  const config = validateE2EEnvironment({
    E2E_DATABASE_URL: "postgresql://teste:segredo@teste-pooler.example/db",
    DIRECT_URL: "postgresql://teste:segredo@padrao.example/db",
    E2E_API_PORT: "3313",
  });
  expect(new URL(config.databaseUrl).hostname).toBe("teste.example");
  expect(config.port).toBe(3313);
});

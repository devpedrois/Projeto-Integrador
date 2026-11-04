import { expect, it } from "vitest";
import { parseEnvironment } from "../../src/config/environment.js";

const input = {
  DATABASE_URL: "postgresql://recomendacao_app:ficticio@localhost/origem",
  RECOMENDACAO_SERVICE_TOKEN: "token-sintetico-para-testes-com-32-caracteres",
};

it("aplica os padroes de runtime sem carregar credenciais administrativas", () => {
  expect(parseEnvironment(input)).toMatchObject({
    HOST: "127.0.0.1",
    PORT: 3002,
    API_SCHEMA: "public",
    RECOMENDACAO_SCHEMA: "recomendacao",
    NODE_ENV: "development",
  });
  expect(
    parseEnvironment({ ...input, BOOTSTRAP_DATABASE_URL: "segredo" }),
  ).not.toHaveProperty("BOOTSTRAP_DATABASE_URL");
});

it.each([
  { DATABASE_URL: "https://segredo.invalid" },
  { DATABASE_URL: "segredo-invalido-nao-expor" },
  { RECOMENDACAO_SERVICE_TOKEN: "segredo-curto" },
  { PORT: "0" },
  { API_SCHEMA: "public;DROP SCHEMA public" },
  { RECOMENDACAO_SCHEMA: "public" },
  { NODE_ENV: "invalido" },
])("rejeita configuracao invalida sem revelar valores: %j", (invalid) => {
  expect(() => parseEnvironment({ ...input, ...invalid })).toThrow(
    /Invalid environment variables:/,
  );
  try {
    parseEnvironment({ ...input, ...invalid });
  } catch (error) {
    expect(String(error)).not.toContain("segredo");
  }
});

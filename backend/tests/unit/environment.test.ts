import { describe, expect, it } from "vitest";
import { parseEnvironment } from "../../src/config/environment.js";

describe("environment validation", () => {
  const databaseEnvironment = {
    RECOMENDACAO_URL: "http://127.0.0.1:3002",
    RECOMENDACAO_SERVICE_TOKEN:
      "synthetic-service-token-with-at-least-32-characters",
    DATABASE_URL: "postgresql://user:secret@localhost:5432/origem",
    DIRECT_URL: "postgresql://user:secret@localhost:5432/origem",
  };

  it("defaults to an in-process worker with concurrency one", () => {
    const environment = parseEnvironment(databaseEnvironment);
    expect(environment.RUN_WORKER_IN_API).toBe(true);
    expect(environment.WORKER_CONCURRENCY).toBe(1);
  });

  it("defaults notification latency to zero", () => {
    expect(parseEnvironment(databaseEnvironment).NOTIFICACAO_LATENCIA_MS).toBe(
      0,
    );
  });

  it.each(["0", "200", "2000"])("accepts simulated latency %s", (value) => {
    expect(
      parseEnvironment({
        ...databaseEnvironment,
        NOTIFICACAO_LATENCIA_MS: value,
      }).NOTIFICACAO_LATENCIA_MS,
    ).toBe(Number(value));
  });

  it.each(["", " ", "-1", "2001", "1.5", "Infinity", "invalid"])(
    "rejects invalid simulated latency %s",
    (value) => {
      expect(() =>
        parseEnvironment({
          ...databaseEnvironment,
          NOTIFICACAO_LATENCIA_MS: value,
        }),
      ).toThrow("Invalid environment variables: NOTIFICACAO_LATENCIA_MS");
    },
  );

  it.each(["0", "200"])(
    "rejects configured latency in production: %s",
    (value) => {
      expect(() =>
        parseEnvironment({
          ...databaseEnvironment,
          NODE_ENV: "production",
          JWT_SECRET: "synthetic-jwt-secret-for-tests-only",
          NOTIFICACAO_LATENCIA_MS: value,
        }),
      ).toThrow("Invalid environment variables: NOTIFICACAO_LATENCIA_MS");
    },
  );

  it.each(["true", "false"])("parses RUN_WORKER_IN_API=%s", (value) => {
    expect(
      parseEnvironment({ ...databaseEnvironment, RUN_WORKER_IN_API: value })
        .RUN_WORKER_IN_API,
    ).toBe(value === "true");
  });

  it.each(["", "1", "0", "yes", "FALSE"])(
    "rejects RUN_WORKER_IN_API=%s",
    (value) => {
      expect(() =>
        parseEnvironment({ ...databaseEnvironment, RUN_WORKER_IN_API: value }),
      ).toThrow("Invalid environment variables: RUN_WORKER_IN_API");
    },
  );

  it.each(["1", "8"])("accepts WORKER_CONCURRENCY=%s", (value) => {
    expect(
      parseEnvironment({ ...databaseEnvironment, WORKER_CONCURRENCY: value })
        .WORKER_CONCURRENCY,
    ).toBe(Number(value));
  });

  it.each(["", "0", "9", "-1", "1.5", "Infinity", "invalid"])(
    "rejects WORKER_CONCURRENCY=%s",
    (value) => {
      expect(() =>
        parseEnvironment({ ...databaseEnvironment, WORKER_CONCURRENCY: value }),
      ).toThrow("Invalid environment variables: WORKER_CONCURRENCY");
    },
  );

  it.each(["true", "false", "yes"])(
    "ignora a configuracao retirada ENABLE_COOKIE_PROBE=%s",
    (value) => {
      expect(
        parseEnvironment({
          ...databaseEnvironment,
          ENABLE_COOKIE_PROBE: value,
        }),
      ).not.toHaveProperty("ENABLE_COOKIE_PROBE");
    },
  );

  it("accepts production with an explicit host and a valid JWT secret", () => {
    const environment = parseEnvironment({
      ...databaseEnvironment,
      NODE_ENV: "production",
      HOST: "0.0.0.0",
      JWT_SECRET: "synthetic-jwt-secret-for-tests-only",
      FRONTEND_ORIGIN: "https://origem.example",
    });

    expect(environment.NODE_ENV).toBe("production");
    expect(environment.HOST).toBe("0.0.0.0");
    expect(environment.JWT_SECRET).toBe("synthetic-jwt-secret-for-tests-only");
    expect(environment.FRONTEND_ORIGIN).toBe("https://origem.example");
    expect(environment.COOKIE_SECURE).toBe(true);
    expect(environment.CACHE_TTL_SECONDS).toBe(60);
  });

  it("defaults to local development without requiring a JWT secret", () => {
    const environment = parseEnvironment(databaseEnvironment);

    expect(environment.NODE_ENV).toBe("development");
    expect(environment.HOST).toBe("127.0.0.1");
    expect(environment.JWT_SECRET).toBeUndefined();
    expect(environment.FRONTEND_ORIGIN).toBe("http://localhost:3000");
    expect(environment.COOKIE_SECURE).toBe(false);
    expect(environment.CACHE_TTL_SECONDS).toBe(60);
  });

  it("requires JWT_SECRET in production without exposing its value", () => {
    expect(() =>
      parseEnvironment({
        ...databaseEnvironment,
        NODE_ENV: "production",
      }),
    ).toThrow("Invalid environment variables: JWT_SECRET");
  });

  it.each(["development", "test", "production"])(
    "rejects short JWT secrets in %s",
    (nodeEnv) => {
      expect(() =>
        parseEnvironment({
          ...databaseEnvironment,
          NODE_ENV: nodeEnv,
          JWT_SECRET: "synthetic-short-secret",
        }),
      ).toThrow(/^Invalid environment variables: JWT_SECRET$/);
    },
  );

  it("rejects whitespace-only JWT secrets", () => {
    expect(() =>
      parseEnvironment({
        ...databaseEnvironment,
        NODE_ENV: "production",
        JWT_SECRET: " ".repeat(32),
      }),
    ).toThrow(/^Invalid environment variables: JWT_SECRET$/);
  });

  it.each(["true", "false"])(
    "parses COOKIE_SECURE=%s as a boolean",
    (value) => {
      const environment = parseEnvironment({
        ...databaseEnvironment,
        COOKIE_SECURE: value,
      });

      expect(environment.COOKIE_SECURE).toBe(value === "true");
    },
  );

  it.each(["", "1", "0", "yes", "FALSE"])(
    "rejects ambiguous COOKIE_SECURE=%s",
    (value) => {
      expect(() =>
        parseEnvironment({ ...databaseEnvironment, COOKIE_SECURE: value }),
      ).toThrow(/^Invalid environment variables: COOKIE_SECURE$/);
    },
  );

  it("accepts an explicit cookie flag and cache TTL in production", () => {
    const environment = parseEnvironment({
      ...databaseEnvironment,
      NODE_ENV: "production",
      JWT_SECRET: "synthetic-jwt-secret-for-tests-only",
      COOKIE_SECURE: "false",
      CACHE_TTL_SECONDS: "120",
    });

    expect(environment.COOKIE_SECURE).toBe(false);
    expect(environment.CACHE_TTL_SECONDS).toBe(120);
  });

  it.each(["", "0", "-1", "1.5", "Infinity", "invalid"])(
    "rejects invalid cache TTL=%s",
    (value) => {
      expect(() =>
        parseEnvironment({ ...databaseEnvironment, CACHE_TTL_SECONDS: value }),
      ).toThrow(/^Invalid environment variables: CACHE_TTL_SECONDS$/);
    },
  );

  it.each(["", "   "])("rejects an empty HOST=%s", (value) => {
    expect(() =>
      parseEnvironment({ ...databaseEnvironment, HOST: value }),
    ).toThrow(/^Invalid environment variables: HOST$/);
  });

  it.each([
    "invalid",
    "ftp://origem.example",
    "https://origem.example/path",
    "https://origem.example?token=synthetic-secret",
    "https://user:synthetic-secret@origem.example",
  ])("rejects invalid frontend origins without exposing values", (value) => {
    expect(() =>
      parseEnvironment({ ...databaseEnvironment, FRONTEND_ORIGIN: value }),
    ).toThrow(/^Invalid environment variables: FRONTEND_ORIGIN$/);
  });

  it("reports invalid names together without values", () => {
    expect(() =>
      parseEnvironment({
        ...databaseEnvironment,
        DATABASE_URL: "postgresql://user:secret@localhost:5432/origem",
        DIRECT_URL: "postgresql://user:secret@localhost:5432/origem",
        NODE_ENV: "production",
        JWT_SECRET: "synthetic-short-secret",
        COOKIE_SECURE: "invalid",
      }),
    ).toThrow(/^Invalid environment variables: COOKIE_SECURE, JWT_SECRET$/);
  });

  it("rejects missing connection variables without exposing values", () => {
    expect(() => parseEnvironment({})).toThrow(
      "Invalid environment variables: DATABASE_URL, DIRECT_URL, RECOMENDACAO_SERVICE_TOKEN, RECOMENDACAO_URL",
    );
  });

  it("accepts PostgreSQL URLs and a valid port", () => {
    const environment = parseEnvironment({
      ...databaseEnvironment,
      DATABASE_URL: "postgresql://user:secret@localhost:5432/origem",
      DIRECT_URL: "postgresql://user:secret@localhost:5432/origem",
      NODE_ENV: "test",
      PORT: "3100",
    });

    expect(environment.PORT).toBe(3100);
    expect(environment.NODE_ENV).toBe("test");
  });
});

const recommendationEnvironment = {
  DATABASE_URL: "postgresql://user:secret@localhost:5432/origem",
  DIRECT_URL: "postgresql://user:secret@localhost:5432/origem",
  RECOMENDACAO_URL: "http://127.0.0.1:3002",
  RECOMENDACAO_SERVICE_TOKEN:
    "synthetic-service-token-with-at-least-32-characters",
};
it("configura timeout HTTP padrao de 800ms", () => {
  expect(
    parseEnvironment(recommendationEnvironment).RECOMENDACAO_TIMEOUT_MS,
  ).toBe(800);
});
it.each(["100", "5000"])("aceita timeout %s", (value) => {
  expect(
    parseEnvironment({
      ...recommendationEnvironment,
      RECOMENDACAO_TIMEOUT_MS: value,
    }).RECOMENDACAO_TIMEOUT_MS,
  ).toBe(Number(value));
});
it.each(["99", "5001", "", "NaN", "100.5"])("recusa timeout %s", (value) => {
  expect(() =>
    parseEnvironment({
      ...recommendationEnvironment,
      RECOMENDACAO_TIMEOUT_MS: value,
    }),
  ).toThrow("Invalid environment variables: RECOMENDACAO_TIMEOUT_MS");
});
it.each([
  "ftp://internal",
  "http://user:secret@internal",
  "http://internal/path",
  "http://internal?token=secret",
  "http://internal#fragment",
])("recusa destino com credenciais ou caminho", (value) => {
  expect(() =>
    parseEnvironment({ ...recommendationEnvironment, RECOMENDACAO_URL: value }),
  ).toThrow(/^Invalid environment variables: RECOMENDACAO_URL$/);
});
it.each([
  "https://internal.example",
  "http://127.0.0.1:3002",
  "http://internal.example/",
])("aceita origem HTTP: %s", (value) => {
  expect(
    parseEnvironment({
      ...recommendationEnvironment,
      RECOMENDACAO_URL: value,
    }).RECOMENDACAO_URL,
  ).toBe(new URL(value).origin);
});
it.each(["", "short", " ".repeat(32)])(
  "recusa token ausente ou curto",
  (value) => {
    expect(() =>
      parseEnvironment({
        ...recommendationEnvironment,
        RECOMENDACAO_SERVICE_TOKEN: value,
      }),
    ).toThrow(/^Invalid environment variables: RECOMENDACAO_SERVICE_TOKEN$/);
  },
);

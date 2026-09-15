import { describe, expect, it } from "vitest";
import { parseEnvironment } from "../../src/config/environment.js";

describe("environment validation", () => {
  it("rejects production runtime", () => {
    expect(() => parseEnvironment({
      DATABASE_URL: "postgresql://user:secret@localhost:5432/origem",
      DIRECT_URL: "postgresql://user:secret@localhost:5432/origem",
      NODE_ENV: "production",
    })).toThrow("Invalid environment variables: NODE_ENV");
  });

  it("rejects missing connection variables without exposing values", () => {
    expect(() => parseEnvironment({})).toThrow(
      "Invalid environment variables: DATABASE_URL, DIRECT_URL",
    );
  });

  it("accepts PostgreSQL URLs and a valid port", () => {
    const environment = parseEnvironment({
      DATABASE_URL: "postgresql://user:secret@localhost:5432/origem",
      DIRECT_URL: "postgresql://user:secret@localhost:5432/origem",
      NODE_ENV: "test",
      PORT: "3100",
    });

    expect(environment.PORT).toBe(3100);
    expect(environment.NODE_ENV).toBe("test");
  });
});

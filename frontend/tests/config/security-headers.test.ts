import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig from "../../next.config";

afterEach(() => vi.unstubAllEnvs());

async function securityHeaders(environment = "production") {
  vi.stubEnv("NODE_ENV", environment);
  expect(nextConfig.headers).toBeTypeOf("function");
  const rules = await nextConfig.headers?.();
  const globalRule = rules?.find((rule) => rule.source === "/:path*");
  expect(globalRule).toBeDefined();
  return new Map(globalRule?.headers.map(({ key, value }) => [key, value]));
}

function directives(policy: string | undefined) {
  expect(policy).toBeDefined();
  return new Map(
    policy
      ?.split(";")
      .filter(Boolean)
      .map((directive) => {
        const [name, ...sources] = directive.trim().split(/\s+/);
        return [name, sources];
      }),
  );
}

describe("cabeçalhos de segurança globais", () => {
  it("restringe origens sem bloquear imagens locais, Blob e prévia", async () => {
    const headers = await securityHeaders();
    const csp = directives(headers.get("Content-Security-Policy"));

    expect(csp.get("default-src")).toEqual(["'self'"]);
    expect(csp.get("img-src")).toEqual([
      "'self'",
      "data:",
      "blob:",
      "https://peqzo3marpkt7bsh.public.blob.vercel-storage.com",
    ]);
    expect(csp.get("connect-src")).toEqual(["'self'"]);
    expect(csp.get("font-src")).toEqual(["'self'"]);
    expect(csp.get("frame-ancestors")).toEqual(["'none'"]);
    expect(csp.get("base-uri")).toEqual(["'self'"]);
    expect(csp.get("form-action")).toEqual(["'self'"]);
    expect(csp.get("object-src")).toEqual(["'none'"]);
    expect(csp.get("frame-src")).toEqual(["'none'"]);
    expect(csp.get("script-src")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(csp.get("style-src")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(headers.has("Content-Security-Policy-Report-Only")).toBe(false);
  });

  it("bloqueia detecção MIME e recursos desnecessários", async () => {
    const headers = await securityHeaders();

    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers.get("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=(), fullscreen=()",
    );
  });

  it("permite eval somente no desenvolvimento do Next", async () => {
    const development = directives(
      (await securityHeaders("development")).get("Content-Security-Policy"),
    );
    expect(development.get("script-src")).toEqual([
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
    ]);
    const production = (await securityHeaders()).get("Content-Security-Policy");
    expect(production).not.toContain("'unsafe-eval'");
  });
});

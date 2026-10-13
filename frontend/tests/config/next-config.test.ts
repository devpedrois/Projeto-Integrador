import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig from "../../next.config";

afterEach(() => {
  vi.unstubAllEnvs();
});

async function rewrites() {
  if (nextConfig.rewrites === undefined) {
    throw new Error("A configuração deve resolver os rewrites opcionais.");
  }
  return nextConfig.rewrites();
}

describe("proxy da API", () => {
  it.each([undefined, "", "   "])("não registra rewrite sem BACKEND_URL", async (value) => {
    vi.stubEnv("BACKEND_URL", value);

    expect(await rewrites()).toEqual([]);
  });

  it.each([
    ["https://origem-backend.example", "https://origem-backend.example/:path*"],
    ["https://origem-backend.example/", "https://origem-backend.example/:path*"],
    ["http://127.0.0.1:3001", "http://127.0.0.1:3001/:path*"],
  ])("encaminha /api para a origem %s", async (backendUrl, destination) => {
    vi.stubEnv("BACKEND_URL", backendUrl);

    expect(await rewrites()).toEqual([{ source: "/api/:path*", destination }]);
    expect(nextConfig.env).toBeUndefined();
  });

  it("não usa a variável pública como destino", async () => {
    vi.stubEnv("BACKEND_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "https://origem-backend.example");

    expect(await rewrites()).toEqual([]);
  });

  it.each([
    "invalid",
    "//origem-backend.example",
    "ftp://origem-backend.example",
    "https://origem-backend.example/api",
    "https://origem-backend.example?token=synthetic-secret",
    "https://origem-backend.example#fragment",
    "https://user:synthetic-secret@origem-backend.example",
  ])("rejeita destino inválido sem revelar valores", async (backendUrl) => {
    vi.stubEnv("BACKEND_URL", backendUrl);

    await expect(rewrites()).rejects.toThrow(/^BACKEND_URL inválida: informe uma origem HTTP ou HTTPS\.$/);
  });
});

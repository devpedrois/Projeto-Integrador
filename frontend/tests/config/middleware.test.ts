import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";
async function middleware() {
  expect(existsSync(resolve("src/middleware.ts"))).toBe(true);
  const modulePath = "@/middleware";
  return ((await import(modulePath)) as typeof import("@/middleware"))
    .middleware;
}
afterEach(() => vi.unstubAllEnvs());
it.each(["/admin", "/painel-artesao/produtos", "/minha-conta?aba=pedidos"])(
  "sem cookie redireciona %s no servidor",
  async (path) => {
    vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http");
    const response = (await middleware())(
      new NextRequest(`https://origem.test${path}`),
    );
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("retorno")).toBe(path);
  },
);
it("cookie nao vazio permite que API e guarda decidam papel", async () => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http");
  const response = (await middleware())(
    new NextRequest("https://origem.test/admin", {
      headers: { cookie: "origem_sessao=valor-sintetico" },
    }),
  );
  expect(response.headers.get("location")).toBeNull();
});
it("fake mantem navegacao sem cookie", async () => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "fake");
  expect(
    (await middleware())(
      new NextRequest("https://origem.test/admin"),
    ).headers.get("location"),
  ).toBeNull();
});

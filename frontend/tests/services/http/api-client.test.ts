import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

async function client(timeoutMs = 1000) {
  expect(existsSync(resolve("src/services/http/api-client.ts"))).toBe(true);
  const modulePath = "@/services/http/api-client";
  const { ApiClient } = (await import(
    modulePath
  )) as typeof import("@/services/http/api-client");
  return new ApiClient({ timeoutMs });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("ApiClient", () => {
  it("usa /api, JSON, no-store e cookie da mesma origem", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: "u1" }));
    vi.stubGlobal("fetch", fetchMock);
    expect(
      await (
        await client()
      ).request("/auth/login", {
        method: "POST",
        body: { email: "ana@origem.test", senha: "sintetica" },
      }),
    ).toEqual({ id: "u1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        credentials: "include",
        cache: "no-store",
        method: "POST",
        body: JSON.stringify({ email: "ana@origem.test", senha: "sintetica" }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it.each([
    [401, undefined, "NAO_AUTENTICADO"],
    [401, "CREDENCIAIS_INVALIDAS", "CREDENCIAIS_INVALIDAS"],
    [403, undefined, "ACESSO_NEGADO"],
    [404, undefined, "NAO_ENCONTRADO"],
    [409, "EMAIL_JA_CADASTRADO", "EMAIL_JA_CADASTRADO"],
    [400, "VALIDACAO", "VALIDACAO"],
    [413, "FOTO_MUITO_GRANDE", "FOTO_MUITO_GRANDE"],
    [503, undefined, "SERVICO_INDISPONIVEL"],
  ])("mapeia status %s e codigo %s", async (status, code, expected) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: {
              code,
              message: "segredo-interno",
              detalhes: { senha: "nao-expor" },
            },
          },
          { status: Number(status) },
        ),
      ),
    );
    const error = await (
      await client()
    )
      .request("/auth/me")
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ name: "ServiceError", code: expected });
    expect(JSON.stringify(error)).not.toContain("segredo-interno");
    expect(JSON.stringify(error)).not.toContain("nao-expor");
  });

  it("204 nao tenta interpretar JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
    expect(
      await (await client()).request("/auth/logout", { method: "POST" }),
    ).toBeUndefined();
  });

  it("mapeia erro de rede sem expor detalhes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("credencial-secreta")),
    );
    await expect((await client()).request("/auth/me")).rejects.toMatchObject({
      code: "ERRO_REDE",
    });
  });

  it("timeout aborta fetch mesmo quando transporte nao responde", async () => {
    const api = await client(50);
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url, options: RequestInit) => {
        signal = options.signal as AbortSignal;
        return new Promise<Response>(() => {});
      }),
    );
    const pending = api.request("/auth/me");
    const assertion = expect(pending).rejects.toMatchObject({
      code: "TIMEOUT",
    });
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    expect(signal?.aborted).toBe(true);
  });

  it("timeout cobre leitura do corpo", async () => {
    const api = await client(50);
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => new Promise(() => {}),
      }),
    );
    const assertion = expect(api.request("/auth/me")).rejects.toMatchObject({
      code: "TIMEOUT",
    });
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
  });

  it("rejeita JSON invalido e mantem status de erro sem JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>falha</html>")),
    );
    await expect((await client()).request("/auth/me")).rejects.toMatchObject({
      code: "RESPOSTA_INVALIDA",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("falha", { status: 401 })),
    );
    await expect((await client()).request("/auth/me")).rejects.toMatchObject({
      code: "NAO_AUTENTICADO",
    });
  });

  it("nao envia cookies para destinos externos", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      (await client()).request("//externo.test/auth/me"),
    ).rejects.toMatchObject({ code: "ENTRADA_INVALIDA" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

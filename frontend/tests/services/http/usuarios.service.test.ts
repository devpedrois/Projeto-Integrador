import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import type { CadastroInput } from "@/types/cadastro";

const usuario = {
  id: "u1",
  nome: "Ana Silva",
  email: "ana@origem.test",
  papel: "comprador",
};
async function service() {
  expect(existsSync(resolve("src/services/http/usuarios.service.ts"))).toBe(
    true,
  );
  const modulePath = "@/services/http/usuarios.service";
  const { HttpUsuariosService } = (await import(
    modulePath
  )) as typeof import("@/services/http/usuarios.service");
  return new HttpUsuariosService();
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("restaura sessao quando o servidor inicia apos falhas transitorias", async () => {
  const api = await service();
  vi.useFakeTimers();
  const fetchMock = vi
    .fn()
    .mockRejectedValueOnce(new TypeError("servico iniciando"))
    .mockResolvedValueOnce(Response.json({}, { status: 503 }))
    .mockResolvedValueOnce(Response.json(usuario));
  vi.stubGlobal("fetch", fetchMock);

  const assertion = expect(api.me()).resolves.toEqual(usuario);
  await vi.advanceTimersByTimeAsync(3000);
  await assertion;
});

it("recupera sessao apos abortar a primeira consulta por timeout", async () => {
  const { ApiClient } = await import("@/services/http/api-client");
  const { HttpUsuariosService } =
    await import("@/services/http/usuarios.service");
  const api = new HttpUsuariosService(new ApiClient({ timeoutMs: 50 }));
  vi.useFakeTimers();
  let primeiraConsulta: AbortSignal | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn()
      .mockImplementationOnce((_url: string, options: RequestInit) => {
        primeiraConsulta = options.signal as AbortSignal;
        return new Promise<Response>(() => {});
      })
      .mockResolvedValueOnce(Response.json(usuario)),
  );

  const assertion = expect(api.me()).resolves.toEqual(usuario);
  await vi.advanceTimersByTimeAsync(1050);
  await assertion;
  expect(primeiraConsulta?.aborted).toBe(true);
});

it("encerra recuperacao automatica se o servidor continua indisponivel", async () => {
  const api = await service();
  vi.useFakeTimers();
  const fetchMock = vi.fn().mockRejectedValue(new TypeError("sem rede"));
  vi.stubGlobal("fetch", fetchMock);

  const assertion = expect(api.me()).rejects.toMatchObject({
    code: "ERRO_REDE",
  });
  await vi.advanceTimersByTimeAsync(7000);
  await assertion;
  const chamadasAoEncerrar = fetchMock.mock.calls.length;
  await vi.advanceTimersByTimeAsync(60000);
  expect(fetchMock).toHaveBeenCalledTimes(chamadasAoEncerrar);
  expect(chamadasAoEncerrar).toBeGreaterThan(1);
});

it("sessao ausente nao dispara novas tentativas de autenticacao", async () => {
  const api = await service();
  vi.useFakeTimers();
  const fetchMock = vi
    .fn()
    .mockResolvedValue(Response.json({}, { status: 401 }));
  vi.stubGlobal("fetch", fetchMock);

  await expect(api.me()).rejects.toMatchObject({ code: "NAO_AUTENTICADO" });
  await vi.advanceTimersByTimeAsync(60000);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("falha de login nao repete envio de credenciais automaticamente", async () => {
  const api = await service();
  vi.useFakeTimers();
  const fetchMock = vi.fn().mockRejectedValue(new TypeError("sem rede"));
  vi.stubGlobal("fetch", fetchMock);

  await expect(
    api.login({ email: usuario.email, senha: "senha-sintetica" }),
  ).rejects.toMatchObject({ code: "ERRO_REDE" });
  await vi.advanceTimersByTimeAsync(60000);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("cadastro usa auth/register e retorna usuario publico ativo", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      Response.json({ ...usuario, senhaHash: "nao-retornar" }, { status: 201 }),
    );
  vi.stubGlobal("fetch", fetchMock);
  const result = await (
    await service()
  ).register({
    nome: "Ana Silva",
    email: " ANA@origem.test ",
    senha: "senha-sintetica",
    papel: "comprador",
  });
  expect(result).toEqual({ ...usuario, ativo: true });
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/auth/register",
    expect.objectContaining({
      body: JSON.stringify({
        nome: "Ana Silva",
        email: "ana@origem.test",
        senha: "senha-sintetica",
        papel: "comprador",
      }),
    }),
  );
});

it("login, me e logout seguem os endpoints reais", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(Response.json(usuario))
    .mockResolvedValueOnce(Response.json(usuario))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);
  const api = await service();
  expect(
    await api.login({ email: usuario.email, senha: "senha-sintetica" }),
  ).toEqual(usuario);
  expect(await api.me()).toEqual(usuario);
  await api.logout();
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    "/api/auth/login",
    "/api/auth/me",
    "/api/auth/logout",
  ]);
});

it("cadastro admin e rejeitado sem requisicao", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  await expect(
    (await service()).register({
      nome: "Ana",
      email: usuario.email,
      senha: "senha-sintetica",
      papel: "admin",
    } as unknown as CadastroInput),
  ).rejects.toMatchObject({ code: "PAPEL_INVALIDO" });
  expect(fetchMock).not.toHaveBeenCalled();
});

it("resposta sem identidade valida nao cria sessao", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ papel: "admin" })),
  );
  await expect((await service()).me()).rejects.toMatchObject({
    code: "RESPOSTA_INVALIDA",
  });
});

it("papel recebido como array e rejeitado", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ ...usuario, papel: ["admin"] })),
  );
  await expect((await service()).me()).rejects.toMatchObject({
    code: "RESPOSTA_INVALIDA",
  });
});

it("listagem nao utiliza usuarios sinteticos", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([])));
  expect(await (await service()).list()).toEqual([]);
});

it("lista artesaos publicos sem consultar administracao nem expor e-mail", async () => {
  const artesao = { id: "a1", nome: "Maria", papel: "artesao", ativo: true };
  const fetchMock = vi
    .fn()
    .mockImplementation(async (url: string) =>
      url === "/api/artesaos"
        ? Response.json([{ ...artesao, email: "privado@origem.test" }])
        : Response.json({ error: { code: "NAO_AUTORIZADO" } }, { status: 401 }),
    );
  vi.stubGlobal("fetch", fetchMock);
  expect(await (await service()).list()).toEqual([artesao]);
});

it.each([
  { id: "", nome: "Maria", papel: "artesao", ativo: true },
  { id: "a1", nome: " ", papel: "artesao", ativo: true },
  { id: "a1", nome: "Maria", papel: "admin", ativo: true },
  { id: "a1", nome: "Maria", papel: "artesao", ativo: false },
])("recusa identidade invalida na lista publica: %j", async (artesao) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([artesao])));
  await expect((await service()).list()).rejects.toMatchObject({
    code: "RESPOSTA_INVALIDA",
  });
});

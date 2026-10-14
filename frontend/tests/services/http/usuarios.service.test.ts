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
afterEach(() => vi.unstubAllGlobals());

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
  vi.stubGlobal("fetch", vi.fn());
  await expect((await service()).list()).rejects.toMatchObject({
    code: "HTTP_NAO_IMPLEMENTADO",
  });
});

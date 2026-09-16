import { beforeEach, describe, expect, it } from "vitest";
import { BrowserUsuarioRepository } from "@/fake-api/repositories/usuario.repository";
import { FakeUsuariosService } from "@/services/fake/usuarios.service";

const CHAVE_TESTE = "origem:test:usuarios:service:v1";

beforeEach(() => {
  window.localStorage.removeItem(CHAVE_TESTE);
});

describe("FakeUsuariosService.list", () => {
  it("retorna uma Promise", () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeUsuariosService(repo, { latenciaMs: 0 });

    const resultado = service.list();

    expect(resultado).toBeInstanceOf(Promise);
  });

  it("retorna exatamente tres DTOs publicos na primeira execucao", async () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeUsuariosService(repo, { latenciaMs: 0 });

    const usuarios = await service.list();

    expect(usuarios).toHaveLength(3);
    expect(usuarios.map((u) => u.papel).sort()).toEqual([
      "admin",
      "artesao",
      "comprador",
    ]);
  });

  it("nunca inclui a senha no retorno", async () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeUsuariosService(repo, { latenciaMs: 0 });

    const usuarios = await service.list();

    for (const usuario of usuarios) {
      expect("senha" in usuario).toBe(false);
    }
  });

  it("respeita a latencia configurada", async () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeUsuariosService(repo, { latenciaMs: 30 });

    const inicio = Date.now();
    await service.list();
    const duracao = Date.now() - inicio;

    expect(duracao).toBeGreaterThanOrEqual(25);
  });
});

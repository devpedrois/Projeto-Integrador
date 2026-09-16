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

describe("FakeUsuariosService.register", () => {
  it("cria um usuario comprador e retorna DTO publico sem senha", async () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeUsuariosService(repo, { latenciaMs: 0 });

    const criado = await service.register({
      nome: "Nova Compradora",
      email: "nova.compradora@origem.test",
      senha: "senha1234",
      papel: "comprador",
    });

    expect(criado.nome).toBe("Nova Compradora");
    expect(criado.papel).toBe("comprador");
    expect(criado.ativo).toBe(true);
    expect("senha" in criado).toBe(false);
  });

  it("persiste o usuario criado na lista", async () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeUsuariosService(repo, { latenciaMs: 0 });

    await service.register({
      nome: "Novo Artesao",
      email: "novo.artesao@origem.test",
      senha: "senha1234",
      papel: "artesao",
    });
    const usuarios = await service.list();

    expect(usuarios.some((u) => u.email === "novo.artesao@origem.test")).toBe(
      true
    );
  });

  it("rejeita papel admin", async () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeUsuariosService(repo, { latenciaMs: 0 });

    await expect(
      service.register({
        nome: "Tentativa Admin",
        email: "tentativa.admin@origem.test",
        senha: "senha1234",
        // @ts-expect-error papel admin nao e aceito pelo tipo publico
        papel: "admin",
      })
    ).rejects.toMatchObject({ code: "PAPEL_INVALIDO" });
  });

  it("rejeita senha curta", async () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeUsuariosService(repo, { latenciaMs: 0 });

    await expect(
      service.register({
        nome: "Senha Curta",
        email: "senha.curta@origem.test",
        senha: "curta12",
        papel: "comprador",
      })
    ).rejects.toMatchObject({ code: "CADASTRO_INVALIDO" });
  });

  it("rejeita email identico ao ja cadastrado", async () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeUsuariosService(repo, { latenciaMs: 0 });

    await service.register({
      nome: "Primeira Compradora",
      email: "repetida@origem.test",
      senha: "senha1234",
      papel: "comprador",
    });

    await expect(
      service.register({
        nome: "Segunda Compradora",
        email: "repetida@origem.test",
        senha: "senha1234",
        papel: "comprador",
      })
    ).rejects.toMatchObject({ code: "EMAIL_JA_CADASTRADO" });
  });

  it("rejeita email duplicado com diferenca de maiusculas e espacos", async () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeUsuariosService(repo, { latenciaMs: 0 });

    await service.register({
      nome: "Primeira Compradora",
      email: "repetida@origem.test",
      senha: "senha1234",
      papel: "comprador",
    });

    await expect(
      service.register({
        nome: "Segunda Compradora",
        email: "  Repetida@Origem.Test  ",
        senha: "senha1234",
        papel: "comprador",
      })
    ).rejects.toMatchObject({ code: "EMAIL_JA_CADASTRADO" });

    const usuarios = await service.list();
    expect(usuarios.filter((u) => u.email === "repetida@origem.test")).toHaveLength(1);
  });

  it("aceita cadastro com email realmente novo apos tentativa duplicada", async () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakeUsuariosService(repo, { latenciaMs: 0 });

    await service.register({
      nome: "Primeira Compradora",
      email: "repetida@origem.test",
      senha: "senha1234",
      papel: "comprador",
    });

    await expect(
      service.register({
        nome: "Segunda Compradora",
        email: "repetida@origem.test",
        senha: "senha1234",
        papel: "comprador",
      })
    ).rejects.toMatchObject({ code: "EMAIL_JA_CADASTRADO" });

    const criado = await service.register({
      nome: "Nova Pessoa",
      email: "email.novo@origem.test",
      senha: "senha1234",
      papel: "artesao",
    });

    expect(criado.email).toBe("email.novo@origem.test");
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { BrowserUsuarioRepository } from "@/fake-api/repositories/usuario.repository";
import type { Usuario } from "@/types/usuario";

const CHAVE_TESTE = "origem:test:usuarios:repository:v1";

function usuario(overrides: Partial<Usuario> = {}): Usuario {
  return {
    id: crypto.randomUUID(),
    nome: "Usuario Teste",
    email: "usuario@origem.test",
    senha: "senha1234",
    papel: "comprador",
    ativo: true,
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.removeItem(CHAVE_TESTE);
});

describe("BrowserUsuarioRepository.create", () => {
  it("rejeita email identico ao ja cadastrado", async () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();
    await repo.create(usuario({ email: "duplicado@origem.test" }));

    await expect(
      repo.create(usuario({ email: "duplicado@origem.test" }))
    ).rejects.toMatchObject({ code: "EMAIL_JA_CADASTRADO" });
  });

  it("rejeita email com diferenca de maiusculas e minusculas", async () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();
    await repo.create(usuario({ email: "duplicado@origem.test" }));

    await expect(
      repo.create(usuario({ email: "DUPLICADO@Origem.Test" }))
    ).rejects.toMatchObject({ code: "EMAIL_JA_CADASTRADO" });
  });

  it("rejeita email com espacos externos", async () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();
    await repo.create(usuario({ email: "duplicado@origem.test" }));

    await expect(
      repo.create(usuario({ email: "  duplicado@origem.test  " }))
    ).rejects.toMatchObject({ code: "EMAIL_JA_CADASTRADO" });
  });

  it("aceita cadastro de email realmente novo", async () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();
    await repo.create(usuario({ email: "duplicado@origem.test" }));

    const criado = await repo.create(usuario({ email: "novo@origem.test" }));

    expect(criado.email).toBe("novo@origem.test");
    const usuarios = await repo.list();
    expect(usuarios.filter((u) => u.email === "novo@origem.test")).toHaveLength(1);
  });

  it("nao cria registro parcial quando o email e duplicado", async () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();
    await repo.create(usuario({ email: "duplicado@origem.test" }));
    const totalAntes = (await repo.list()).length;

    await expect(
      repo.create(usuario({ email: " Duplicado@Origem.Test " }))
    ).rejects.toMatchObject({ code: "EMAIL_JA_CADASTRADO" });

    const totalDepois = (await repo.list()).length;
    expect(totalDepois).toBe(totalAntes);
  });
});

describe("BrowserUsuarioRepository.update", () => {
  it("altera o status ativo e persiste no storage", async () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();

    const atualizado = await repo.update("seed-artesao-01", { ativo: false });

    expect(atualizado?.ativo).toBe(false);
    const persistidos = await new BrowserUsuarioRepository(
      window.localStorage,
      CHAVE_TESTE
    ).list();
    expect(persistidos.find((u) => u.id === "seed-artesao-01")?.ativo).toBe(false);
  });

  it("retorna null para usuario inexistente", async () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();

    expect(await repo.update("inexistente", { ativo: false })).toBeNull();
  });

  it("preserva id, email, senha e papel mesmo com alteracoes manipuladas", async () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();
    const antes = (await repo.list()).find((u) => u.id === "seed-artesao-01");

    const manipulado = {
      ativo: false,
      id: "outro-id",
      email: "invasor@origem.test",
      senha: "senha-trocada",
      papel: "admin",
    } as unknown as Parameters<BrowserUsuarioRepository["update"]>[1];
    const atualizado = await repo.update("seed-artesao-01", manipulado);

    expect(atualizado).toMatchObject({
      id: antes?.id,
      email: antes?.email,
      senha: antes?.senha,
      papel: "artesao",
      ativo: false,
    });
  });

  it("nao altera os demais usuarios", async () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();
    const antes = await repo.list();

    await repo.update("seed-artesao-01", { ativo: false });

    const depois = await repo.list();
    expect(depois).toHaveLength(antes.length);
    expect(depois.filter((u) => u.id !== "seed-artesao-01")).toEqual(
      antes.filter((u) => u.id !== "seed-artesao-01")
    );
  });
});

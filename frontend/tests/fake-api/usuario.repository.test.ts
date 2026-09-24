import { beforeEach, describe, expect, it } from "vitest";
import { BrowserUsuarioRepository } from "@/fake-api/repositories/usuario.repository";

const CHAVE_TESTE = "origem:test:usuarios:v1";

beforeEach(() => {
  window.localStorage.removeItem(CHAVE_TESTE);
});

describe("BrowserUsuarioRepository", () => {
  it("semeia exatamente cinco usuarios na primeira execucao", async () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);

    await repo.seed();
    const usuarios = await repo.list();

    expect(usuarios).toHaveLength(5);
    expect(usuarios.map((u) => u.papel).sort()).toEqual([
      "admin",
      "artesao",
      "artesao",
      "comprador",
      "comprador",
    ]);
  });

  it("nao sobrescreve alteracoes existentes ao repetir o seed", async () => {
    const primeiraInstancia = new BrowserUsuarioRepository(
      window.localStorage,
      CHAVE_TESTE
    );
    await primeiraInstancia.seed();
    const usuariosSemeados = await primeiraInstancia.list();
    const [primeiro] = usuariosSemeados;
    if (!primeiro) throw new Error("seed deveria criar ao menos um usuario");

    const alterados = usuariosSemeados.map((u) =>
      u.id === primeiro.id ? { ...u, nome: "Nome Alterado" } : u
    );
    window.localStorage.setItem(CHAVE_TESTE, JSON.stringify(alterados));

    const segundaInstancia = new BrowserUsuarioRepository(
      window.localStorage,
      CHAVE_TESTE
    );
    await segundaInstancia.seed();
    const usuarios = await segundaInstancia.list();
    const alterado = usuarios.find((u) => u.id === primeiro.id);

    expect(alterado?.nome).toBe("Nome Alterado");
    expect(usuarios).toHaveLength(5);
  });

  it("armazena os usuarios sob chave versionada", async () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();

    expect(window.localStorage.getItem(CHAVE_TESTE)).not.toBeNull();
  });

  it("adiciona um novo usuario e o mantem na listagem seguinte", async () => {
    const repo = new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();

    const criado = await repo.create({
      id: "novo-1",
      nome: "Novo Usuario",
      email: "novo.usuario@origem.test",
      senha: "senha1234",
      papel: "comprador",
      ativo: true,
    });
    const usuarios = await repo.list();

    expect(criado.id).toBe("novo-1");
    expect(usuarios).toHaveLength(6);
    expect(usuarios.some((u) => u.id === "novo-1")).toBe(true);
  });
});

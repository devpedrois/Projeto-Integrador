import { beforeEach, describe, expect, it } from "vitest";
import { BrowserUsuarioRepository } from "@/fake-api/repositories/usuario.repository";
import { criarVerificadorUsuarioAtivo } from "@/services/fake/verificar-usuario-ativo";
import { USUARIOS_SEED } from "@/fake-api/seeds/usuarios.seed";
import type { Usuario } from "@/types/usuario";
import type { UsuarioSessao } from "@/types/sessao";

function sessaoDe(usuario: Usuario, alteracoes: Partial<UsuarioSessao> = {}): UsuarioSessao {
  const { id, nome, email, papel } = usuario;
  return { id, nome, email, papel, ...alteracoes };
}

const CHAVE_TESTE = "origem:test:usuarios:verificador:v1";

beforeEach(() => {
  window.localStorage.removeItem(CHAVE_TESTE);
});

function criarRepositorio(): BrowserUsuarioRepository {
  return new BrowserUsuarioRepository(window.localStorage, CHAVE_TESTE);
}

describe("criarVerificadorUsuarioAtivo", () => {
  it("considera ativo um usuario do seed sem precisar de seed previo", async () => {
    const usuarioSeed = USUARIOS_SEED.find((usuario) => usuario.ativo);
    const verificar = criarVerificadorUsuarioAtivo(criarRepositorio());

    expect(await verificar(sessaoDe(usuarioSeed!))).toBe(true);
  });

  it("considera inativo um usuario desativado", async () => {
    const repositorio = criarRepositorio();
    await repositorio.seed();
    const alvo = USUARIOS_SEED.find((usuario) => usuario.papel === "comprador")!;
    await repositorio.update(alvo.id, { ativo: false });

    expect(await criarVerificadorUsuarioAtivo(repositorio)(sessaoDe(alvo))).toBe(false);
  });

  it("considera inativo um usuario inexistente", async () => {
    const verificar = criarVerificadorUsuarioAtivo(criarRepositorio());
    const fantasma = sessaoDe(USUARIOS_SEED[0]!, { id: "nao-existe" });

    expect(await verificar(fantasma)).toBe(false);
  });

  it("rejeita sessao com papel diferente do cadastro", async () => {
    const comprador = USUARIOS_SEED.find((usuario) => usuario.papel === "comprador")!;
    const verificar = criarVerificadorUsuarioAtivo(criarRepositorio());

    expect(await verificar(sessaoDe(comprador, { papel: "admin" }))).toBe(false);
  });

  it("rejeita sessao com email diferente do cadastro", async () => {
    const comprador = USUARIOS_SEED.find((usuario) => usuario.papel === "comprador")!;
    const verificar = criarVerificadorUsuarioAtivo(criarRepositorio());

    expect(await verificar(sessaoDe(comprador, { email: "outro@origem.test" }))).toBe(false);
  });
});

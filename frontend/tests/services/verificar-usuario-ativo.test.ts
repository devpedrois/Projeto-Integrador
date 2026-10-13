import { beforeEach, describe, expect, it } from "vitest";
import { BrowserUsuarioRepository } from "@/fake-api/repositories/usuario.repository";
import { criarVerificadorUsuarioAtivo } from "@/services/fake/verificar-usuario-ativo";
import { USUARIOS_SEED } from "@/fake-api/seeds/usuarios.seed";

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

    expect(await verificar(usuarioSeed!.id)).toBe(true);
  });

  it("considera inativo um usuario desativado", async () => {
    const repositorio = criarRepositorio();
    await repositorio.seed();
    const alvo = USUARIOS_SEED.find((usuario) => usuario.papel === "comprador")!;
    await repositorio.update(alvo.id, { ativo: false });

    expect(await criarVerificadorUsuarioAtivo(repositorio)(alvo.id)).toBe(false);
  });

  it("considera inativo um usuario inexistente", async () => {
    const verificar = criarVerificadorUsuarioAtivo(criarRepositorio());

    expect(await verificar("nao-existe")).toBe(false);
  });
});

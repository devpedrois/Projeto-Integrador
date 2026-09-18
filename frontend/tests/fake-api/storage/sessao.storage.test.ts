import { beforeEach, describe, expect, it } from "vitest";
import { BrowserSessaoStorage } from "@/fake-api/storage/sessao.storage";
import type { UsuarioSessao } from "@/types/sessao";

const CHAVE_TESTE = "origem:test:sessao:storage:v1";

beforeEach(() => {
  window.localStorage.removeItem(CHAVE_TESTE);
});

describe("BrowserSessaoStorage", () => {
  it("retorna null quando nao ha sessao salva", () => {
    const storage = new BrowserSessaoStorage(window.localStorage, CHAVE_TESTE);

    expect(storage.ler()).toBeNull();
  });

  it("persiste e le a sessao salva", () => {
    const storage = new BrowserSessaoStorage(window.localStorage, CHAVE_TESTE);
    const sessao: UsuarioSessao = { id: "u1", nome: "Ana", papel: "comprador" };

    storage.salvar(sessao);

    expect(storage.ler()).toEqual(sessao);
  });

  it("persiste somente id, nome e papel mesmo com campos extras no objeto", () => {
    const storage = new BrowserSessaoStorage(window.localStorage, CHAVE_TESTE);
    const sessaoComExtra = {
      id: "u1",
      nome: "Ana",
      papel: "comprador",
      senha: "nunca-deveria-persistir",
    } as UsuarioSessao;

    storage.salvar(sessaoComExtra);

    const bruto = window.localStorage.getItem(CHAVE_TESTE);
    expect(bruto).not.toContain("senha");
    expect(JSON.parse(bruto as string)).toEqual({
      id: "u1",
      nome: "Ana",
      papel: "comprador",
    });
  });

  it("limpar remove a sessao salva", () => {
    const storage = new BrowserSessaoStorage(window.localStorage, CHAVE_TESTE);
    storage.salvar({ id: "u1", nome: "Ana", papel: "comprador" });

    storage.limpar();

    expect(storage.ler()).toBeNull();
    expect(window.localStorage.getItem(CHAVE_TESTE)).toBeNull();
  });

  it("nao quebra ao ler um valor corrompido no storage", () => {
    window.localStorage.setItem(CHAVE_TESTE, "{json-invalido");
    const storage = new BrowserSessaoStorage(window.localStorage, CHAVE_TESTE);

    expect(storage.ler()).toBeNull();
  });
});

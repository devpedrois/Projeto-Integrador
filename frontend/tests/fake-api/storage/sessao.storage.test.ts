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
    const sessao: UsuarioSessao = { id: "u1", nome: "Ana", email: "ana@origem.test", papel: "comprador" };

    storage.salvar(sessao);

    expect(storage.ler()).toEqual(sessao);
  });

  it("persiste somente id, nome, email e papel mesmo com campos extras no objeto", () => {
    const storage = new BrowserSessaoStorage(window.localStorage, CHAVE_TESTE);
    const sessaoComExtra = {
      id: "u1",
      nome: "Ana",
      email: "ana@origem.test",
      papel: "comprador",
      senha: "nunca-deveria-persistir",
    } as UsuarioSessao;

    storage.salvar(sessaoComExtra);

    const bruto = window.localStorage.getItem(CHAVE_TESTE);
    expect(bruto).not.toContain("senha");
    expect(JSON.parse(bruto as string)).toEqual({
      id: "u1",
      nome: "Ana",
      email: "ana@origem.test",
      papel: "comprador",
    });
  });

  it("limpar remove a sessao salva", () => {
    const storage = new BrowserSessaoStorage(window.localStorage, CHAVE_TESTE);
    storage.salvar({ id: "u1", nome: "Ana", email: "ana@origem.test", papel: "comprador" });

    storage.limpar();

    expect(storage.ler()).toBeNull();
    expect(window.localStorage.getItem(CHAVE_TESTE)).toBeNull();
  });

  it("descarta sessao antiga salva sem email", () => {
    window.localStorage.setItem(
      CHAVE_TESTE,
      JSON.stringify({ id: "u1", nome: "Ana", papel: "comprador" })
    );
    const storage = new BrowserSessaoStorage(window.localStorage, CHAVE_TESTE);

    expect(storage.ler()).toBeNull();
  });

  it("nao quebra ao ler um valor corrompido no storage", () => {
    window.localStorage.setItem(CHAVE_TESTE, "{json-invalido");
    const storage = new BrowserSessaoStorage(window.localStorage, CHAVE_TESTE);

    expect(storage.ler()).toBeNull();
  });

  it.each([
    ["id vazio", { id: "", nome: "Ana", email: "ana@origem.test", papel: "comprador" }],
    ["id ausente", { nome: "Ana", email: "ana@origem.test", papel: "comprador" }],
    ["id nao string", { id: 1, nome: "Ana", email: "ana@origem.test", papel: "comprador" }],
    ["email vazio", { id: "u1", nome: "Ana", email: "", papel: "comprador" }],
    ["email nao string", { id: "u1", nome: "Ana", email: 42, papel: "comprador" }],
    ["papel desconhecido", { id: "u1", nome: "Ana", email: "ana@origem.test", papel: "superadmin" }],
    ["papel ausente", { id: "u1", nome: "Ana", email: "ana@origem.test" }],
    ["valor nao objeto", "texto"],
    ["valor nulo", null],
  ])("descarta e limpa sessao com %s", (_caso, valor) => {
    window.localStorage.setItem(CHAVE_TESTE, JSON.stringify(valor));
    const storage = new BrowserSessaoStorage(window.localStorage, CHAVE_TESTE);

    expect(storage.ler()).toBeNull();
    expect(window.localStorage.getItem(CHAVE_TESTE)).toBeNull();
  });

  it("limpa o storage quando o valor esta corrompido", () => {
    window.localStorage.setItem(CHAVE_TESTE, "{json-invalido");
    const storage = new BrowserSessaoStorage(window.localStorage, CHAVE_TESTE);

    storage.ler();

    expect(window.localStorage.getItem(CHAVE_TESTE)).toBeNull();
  });

  it.each(["comprador", "artesao", "admin"] as const)("aceita papel %s", (papel) => {
    const storage = new BrowserSessaoStorage(window.localStorage, CHAVE_TESTE);
    storage.salvar({ id: "u1", nome: "Ana", email: "ana@origem.test", papel });

    expect(storage.ler()?.papel).toBe(papel);
  });

  it("restaura somente os campos conhecidos da sessao", () => {
    window.localStorage.setItem(
      CHAVE_TESTE,
      JSON.stringify({ id: "u1", nome: "Ana", email: "ana@origem.test", papel: "comprador", extra: "x" })
    );
    const storage = new BrowserSessaoStorage(window.localStorage, CHAVE_TESTE);

    expect(storage.ler()).toEqual({ id: "u1", nome: "Ana", email: "ana@origem.test", papel: "comprador" });
  });
});

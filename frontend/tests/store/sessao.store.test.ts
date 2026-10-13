import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserSessaoStorage } from "@/fake-api/storage/sessao.storage";
import { SessionStore } from "@/store/sessao.store";
import type { UsuarioSessao } from "@/types/sessao";

const CHAVE_TESTE = "origem:test:sessao:store:v1";

const SESSAO: UsuarioSessao = { id: "u1", nome: "Ana", email: "u1@origem.test", papel: "comprador" };

beforeEach(() => {
  window.localStorage.removeItem(CHAVE_TESTE);
});

function criarStore(): SessionStore {
  return new SessionStore(new BrowserSessaoStorage(window.localStorage, CHAVE_TESTE));
}

describe("SessionStore", () => {
  it("comeca sem sessao quando o storage esta vazio", () => {
    const store = criarStore();

    expect(store.getSnapshot()).toBeNull();
  });

  it("restaura a sessao ja persistida na construcao", () => {
    const storage = new BrowserSessaoStorage(window.localStorage, CHAVE_TESTE);
    storage.salvar(SESSAO);

    const store = new SessionStore(storage);

    expect(store.getSnapshot()).toEqual(SESSAO);
  });

  it("login define a sessao em memoria e persiste no storage", () => {
    const store = criarStore();

    store.login(SESSAO);

    expect(store.getSnapshot()).toEqual(SESSAO);
    const restaurado = new BrowserSessaoStorage(window.localStorage, CHAVE_TESTE).ler();
    expect(restaurado).toEqual(SESSAO);
  });

  it("login notifica os ouvintes inscritos", () => {
    const store = criarStore();
    const ouvinte = vi.fn();
    store.subscribe(ouvinte);

    store.login(SESSAO);

    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it("logout limpa a sessao em memoria e no storage", () => {
    const store = criarStore();
    store.login(SESSAO);

    store.logout();

    expect(store.getSnapshot()).toBeNull();
    expect(new BrowserSessaoStorage(window.localStorage, CHAVE_TESTE).ler()).toBeNull();
  });

  it("unsubscribe para de notificar o ouvinte", () => {
    const store = criarStore();
    const ouvinte = vi.fn();
    const cancelar = store.subscribe(ouvinte);

    cancelar();
    store.login(SESSAO);

    expect(ouvinte).not.toHaveBeenCalled();
  });

  it("sessao sobrevive a tres recarregamentos consecutivos", () => {
    const primeiraInstancia = criarStore();
    primeiraInstancia.login(SESSAO);

    for (let recarregamento = 0; recarregamento < 3; recarregamento += 1) {
      const novaInstancia = new SessionStore(
        new BrowserSessaoStorage(window.localStorage, CHAVE_TESTE)
      );
      expect(novaInstancia.getSnapshot()).toEqual(SESSAO);
    }
  });

  it("revalidar encerra a sessao quando o usuario esta desativado", async () => {
    const store = criarStore();
    store.login(SESSAO);
    const ouvinte = vi.fn();
    store.subscribe(ouvinte);

    await store.revalidar(async () => false);

    expect(store.getSnapshot()).toBeNull();
    expect(new BrowserSessaoStorage(window.localStorage, CHAVE_TESTE).ler()).toBeNull();
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it("revalidar mantem a sessao quando o usuario esta ativo", async () => {
    const store = criarStore();
    store.login(SESSAO);
    const verificar = vi.fn(async () => true);

    await store.revalidar(verificar);

    expect(verificar).toHaveBeenCalledWith(SESSAO);
    expect(store.getSnapshot()).toEqual(SESSAO);
  });

  it("revalidar nao consulta nada quando nao ha sessao", async () => {
    const store = criarStore();
    const verificar = vi.fn(async () => false);

    await store.revalidar(verificar);

    expect(verificar).not.toHaveBeenCalled();
  });

  it("revalidar nao encerra sessao trocada durante a verificacao", async () => {
    const store = criarStore();
    store.login(SESSAO);
    const outra: UsuarioSessao = { ...SESSAO, id: "u2", email: "u2@origem.test" };

    await store.revalidar(async () => {
      store.login(outra);
      return false;
    });

    expect(store.getSnapshot()).toEqual(outra);
  });

  it("revalidar encerra a sessao quando a verificacao falha", async () => {
    const store = criarStore();
    store.login(SESSAO);

    await store.revalidar(async () => {
      throw new Error("storage indisponivel");
    });

    expect(store.getSnapshot()).toBeNull();
  });
});

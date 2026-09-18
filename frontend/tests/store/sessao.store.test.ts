import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserSessaoStorage } from "@/fake-api/storage/sessao.storage";
import { SessionStore } from "@/store/sessao.store";
import type { UsuarioSessao } from "@/types/sessao";

const CHAVE_TESTE = "origem:test:sessao:store:v1";

const SESSAO: UsuarioSessao = { id: "u1", nome: "Ana", papel: "comprador" };

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
});

import { afterEach, expect, it, vi } from "vitest";
import { SessionStore } from "@/store/sessao.store";
import { ServiceError } from "@/services/errors";
const sessao = {
  id: "u1",
  nome: "Ana",
  email: "ana@origem.test",
  papel: "comprador" as const,
};
afterEach(() => vi.restoreAllMocks());

it("HTTP hidrata pelo servidor e ignora localStorage", async () => {
  const storage = {
    ler: () => {
      throw new Error("localStorage nao permitido");
    },
    salvar: () => {
      throw new Error("nao salvar sessao HTTP");
    },
    limpar: () => {},
  };
  const store = new SessionStore(storage, {
    me: async () => sessao,
    logout: async () => {},
  });
  expect(store.getSnapshot()).toBeNull();
  expect(store.getRestaurandoSnapshot()).toBe(true);
  await store.hidratar();
  expect(store.getSnapshot()).toEqual(sessao);
  expect(store.getRestaurandoSnapshot()).toBe(false);
  store.login(sessao);
});

it("401 vira visitante; erro de rede permanece recuperavel", async () => {
  let erro = new ServiceError("NAO_AUTENTICADO", "Sessao ausente");
  const store = new SessionStore(null, {
    me: async () => {
      throw erro;
    },
    logout: async () => {},
  });
  await store.hidratar();
  expect(store.getErroSnapshot()).toBeNull();
  erro = new ServiceError("ERRO_REDE", "Sem rede");
  await store.hidratar();
  expect(store.getErroSnapshot()?.code).toBe("ERRO_REDE");
});

it("hidratação atrasada nao apaga login mais recente", async () => {
  let resolve!: (value: typeof sessao) => void;
  const store = new SessionStore(null, {
    me: () =>
      new Promise((r) => {
        resolve = r;
      }),
    logout: async () => {},
  });
  const pending = store.hidratar();
  const nova = { ...sessao, id: "u2", nome: "Bia" };
  store.login(nova);
  resolve(sessao);
  await pending;
  expect(store.getSnapshot()).toEqual(nova);
});

it("logout HTTP so encerra sessao apos sucesso", async () => {
  let falha = true;
  const store = new SessionStore(null, {
    me: async () => sessao,
    logout: async () => {
      if (falha) throw new ServiceError("ERRO_REDE", "Sem rede");
    },
  });
  store.login(sessao);
  await expect(store.logout()).rejects.toMatchObject({ code: "ERRO_REDE" });
  expect(store.getSnapshot()).toEqual(sessao);
  falha = false;
  await store.logout();
  expect(store.getSnapshot()).toBeNull();
});

it("logout impede sessao antiga restaurada por requisicao pendente", async () => {
  let resolve!: (value: typeof sessao) => void;
  const store = new SessionStore(null, {
    me: () =>
      new Promise((r) => {
        resolve = r;
      }),
    logout: async () => {},
  });
  const pending = store.hidratar();
  await store.logout();
  resolve(sessao);
  await pending;
  expect(store.getSnapshot()).toBeNull();
});

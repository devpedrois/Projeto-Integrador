import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { BrowserSessaoStorage } from "@/fake-api/storage/sessao.storage";
import { SessionStore } from "@/store/sessao.store";
import { useSessao } from "@/hooks/use-sessao";
import type { UsuarioSessao } from "@/types/sessao";

const CHAVE_TESTE = "origem:test:sessao:hook:v1";

const SESSAO: UsuarioSessao = { id: "u1", nome: "Ana", papel: "comprador" };

describe("useSessao", () => {
  it("retorna a sessao ja restaurada no primeiro render, sem piscar null", () => {
    const storage = new BrowserSessaoStorage(window.localStorage, CHAVE_TESTE);
    storage.salvar(SESSAO);
    const store = new SessionStore(storage);

    const { result } = renderHook(() => useSessao(store));

    expect(result.current).toEqual(SESSAO);
  });

  it("reage a login e logout do store", () => {
    window.localStorage.removeItem(CHAVE_TESTE);
    const store = new SessionStore(new BrowserSessaoStorage(window.localStorage, CHAVE_TESTE));
    const { result } = renderHook(() => useSessao(store));

    expect(result.current).toBeNull();

    act(() => store.login(SESSAO));
    expect(result.current).toEqual(SESSAO);

    act(() => store.logout());
    expect(result.current).toBeNull();
  });
});

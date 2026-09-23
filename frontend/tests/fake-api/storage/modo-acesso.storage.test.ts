import { beforeEach, describe, expect, it } from "vitest";
import { SessionModoAcessoStorage } from "@/fake-api/storage/modo-acesso.storage";

const CHAVE_TESTE = "origem:test:modo-acesso:v1";

beforeEach(() => {
  window.sessionStorage.removeItem(CHAVE_TESTE);
});

describe("SessionModoAcessoStorage", () => {
  it("ehVisitante retorna falso quando nada foi escolhido", () => {
    const storage = new SessionModoAcessoStorage(window.sessionStorage, CHAVE_TESTE);

    expect(storage.ehVisitante()).toBe(false);
  });

  it("definirVisitante grava a escolha e ehVisitante passa a retornar verdadeiro", () => {
    const storage = new SessionModoAcessoStorage(window.sessionStorage, CHAVE_TESTE);

    storage.definirVisitante();

    expect(storage.ehVisitante()).toBe(true);
  });

  it("usa sessionStorage, nao localStorage", () => {
    const storage = new SessionModoAcessoStorage(window.sessionStorage, CHAVE_TESTE);

    storage.definirVisitante();

    expect(window.sessionStorage.getItem(CHAVE_TESTE)).not.toBeNull();
    expect(window.localStorage.getItem(CHAVE_TESTE)).toBeNull();
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouteGuard } from "@/components/layout/RouteGuard";
import type { SessionStore } from "@/store/sessao.store";
import type { UsuarioSessao } from "@/types/sessao";

const replaceMock = vi.fn();
let pathnameAtual = "/painel-artesao";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => pathnameAtual,
}));

function criarStoreFake(sessao: UsuarioSessao | null): SessionStore {
  return {
    getSnapshot: vi.fn().mockReturnValue(sessao),
    subscribe: vi.fn().mockReturnValue(() => {}),
  } as unknown as SessionStore;
}

beforeEach(() => {
  replaceMock.mockClear();
  pathnameAtual = "/painel-artesao";
});

describe("RouteGuard", () => {
  it("nao decide nem renderiza conteudo antes da sessao ser restaurada", () => {
    render(
      <RouteGuard sessionStore={null} papeisPermitidos={["artesao"]}>
        <div>Conteudo protegido</div>
      </RouteGuard>
    );

    expect(screen.queryByText("Conteudo protegido")).not.toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("visitante sem sessao e redirecionado ao login preservando destino seguro", () => {
    pathnameAtual = "/painel-artesao";
    const store = criarStoreFake(null);

    render(
      <RouteGuard sessionStore={store} papeisPermitidos={["artesao"]}>
        <div>Conteudo protegido</div>
      </RouteGuard>
    );

    expect(replaceMock).toHaveBeenCalledWith("/login?redirect=%2Fpainel-artesao");
    expect(screen.queryByText("Conteudo protegido")).not.toBeInTheDocument();
  });

  it("papel incorreto nao acessa o conteudo protegido", () => {
    const store = criarStoreFake({ id: "u1", nome: "Ana", papel: "comprador" });

    render(
      <RouteGuard sessionStore={store} papeisPermitidos={["artesao"]}>
        <div>Conteudo protegido</div>
      </RouteGuard>
    );

    expect(screen.queryByText("Conteudo protegido")).not.toBeInTheDocument();
    expect(screen.getByText(/acesso negado/i)).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("papel correto acessa a area protegida", () => {
    const store = criarStoreFake({ id: "u2", nome: "Bia", papel: "artesao" });

    render(
      <RouteGuard sessionStore={store} papeisPermitidos={["artesao"]}>
        <div>Conteudo protegido</div>
      </RouteGuard>
    );

    expect(screen.getByText("Conteudo protegido")).toBeInTheDocument();
  });

  it("qualquer usuario autenticado acessa rota sem restricao de papel", () => {
    const store = criarStoreFake({ id: "u3", nome: "Caio", papel: "admin" });

    render(
      <RouteGuard sessionStore={store}>
        <div>Conteudo protegido</div>
      </RouteGuard>
    );

    expect(screen.getByText("Conteudo protegido")).toBeInTheDocument();
  });

  it("nao aceita destino externo ao montar a URL de retorno", () => {
    pathnameAtual = "https://evil.test";
    const store = criarStoreFake(null);

    render(
      <RouteGuard sessionStore={store} papeisPermitidos={["admin"]}>
        <div>Conteudo protegido</div>
      </RouteGuard>
    );

    expect(replaceMock).toHaveBeenCalledWith("/login?redirect=%2F");
  });
});

import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { RouteGuard } from "@/components/layout/RouteGuard";
import { GateAcesso } from "@/components/layout/GateAcesso";
import { LoginForm } from "@/components/login/LoginForm";
import { SessionStore } from "@/store/sessao.store";
import { CartStore } from "@/store/carrinho.store";
import { SessionModoAcessoStorage } from "@/fake-api/storage/modo-acesso.storage";
import { HttpUsuariosService } from "@/services/http/usuarios.service";
import { ServiceError } from "@/services/errors";

const navigation = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
let store: SessionStore;
vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  usePathname: () => "/minha-conta",
}));
vi.mock("@/services/fake/container", () => ({
  obterSessionStore: () => store,
  obterModoAcessoStorage: () =>
    new SessionModoAcessoStorage(window.sessionStorage),
  obterCarrinhoStore: () =>
    new CartStore({ ler: () => null, salvar: () => {}, limpar: () => {} }),
}));
const sessao = {
  id: "u1",
  nome: "Ana",
  email: "ana@origem.test",
  papel: "comprador" as const,
};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

it("guarda aguarda me sem redirecionar nem revelar conteudo", async () => {
  let resolve!: (value: typeof sessao) => void;
  store = new SessionStore(null, {
    me: () =>
      new Promise((r) => {
        resolve = r;
      }),
    logout: async () => {},
  });
  const pending = store.hidratar();
  render(
    <RouteGuard sessionStore={store}>
      <div>Conteudo protegido</div>
    </RouteGuard>,
  );
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(screen.queryByText("Conteudo protegido")).not.toBeInTheDocument();
  await act(async () => {
    resolve(sessao);
    await pending;
  });
  expect(screen.getByText("Conteudo protegido")).toBeInTheDocument();
});

it("falha de me oferece recuperacao sem tratar como visitante", async () => {
  store = new SessionStore(null, {
    me: async () => {
      throw new ServiceError("ERRO_REDE", "Sem rede");
    },
    logout: async () => {},
  });
  await store.hidratar();
  render(
    <RouteGuard sessionStore={store}>
      <div>Conteudo protegido</div>
    </RouteGuard>,
  );
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "Tentar novamente" }),
  ).toBeInTheDocument();
});

it("Gate aguarda logout HTTP antes de navegar", async () => {
  let resolve!: () => void;
  store = new SessionStore(null, {
    me: async () => sessao,
    logout: () =>
      new Promise<void>((r) => {
        resolve = r;
      }),
  });
  store.login(sessao);
  render(
    <GateAcesso>
      <div>Area autenticada</div>
    </GateAcesso>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Sair" }));
  await user.click(screen.getByRole("button", { name: "Sim, sair" }));
  expect(navigation.push).not.toHaveBeenCalled();
  expect(store.getSnapshot()).toEqual(sessao);
  await act(async () => {
    resolve();
  });
  expect(navigation.push).toHaveBeenCalledWith("/");
  expect(store.getSnapshot()).toBeNull();
});

it("login respeita retorno local preservado pelo middleware", async () => {
  window.history.replaceState(
    {},
    "",
    "/login?retorno=%2Fminha-conta%3Faba%3Dpedidos",
  );
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(sessao)));
  store = new SessionStore(null, {
    me: async () => sessao,
    logout: async () => {},
  });
  render(
    <LoginForm service={new HttpUsuariosService()} sessionStore={store} />,
  );
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("E-mail"), sessao.email);
  await user.type(screen.getByLabelText("Senha"), "senha-sintetica");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
  expect(navigation.push).toHaveBeenCalledWith("/minha-conta?aba=pedidos");
});

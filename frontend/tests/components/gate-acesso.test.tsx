import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GateAcesso } from "@/components/layout/GateAcesso";
import { SessionStore } from "@/store/sessao.store";
import { CartStore } from "@/store/carrinho.store";
import { BrowserCarrinhoStorage } from "@/fake-api/storage/carrinho.storage";
import { SessionModoAcessoStorage } from "@/fake-api/storage/modo-acesso.storage";
import type { SessaoStorage } from "@/fake-api/storage/sessao.storage";
import type { UsuarioSessao } from "@/types/sessao";

let sessionStoreMock: SessionStore;
let carrinhoStorePersonalizado: CartStore | undefined;
let pathnameAtual = "/";
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameAtual,
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/services/fake/container", () => ({
  obterSessionStore: () => sessionStoreMock,
  obterModoAcessoStorage: () =>
    new SessionModoAcessoStorage(
      window.sessionStorage,
      "origem:test:gate:modo-acesso",
    ),
  obterCarrinhoStore: (usuarioId?: string) =>
    carrinhoStorePersonalizado ??
    new CartStore(
      new BrowserCarrinhoStorage(
        window.localStorage,
        usuarioId ?? "visitante",
        "origem:test:gate:carrinho",
      ),
    ),
}));

function criarSessaoStorageFake(
  sessaoInicial: UsuarioSessao | null,
): SessaoStorage {
  let atual = sessaoInicial;
  return {
    ler: () => atual,
    salvar: (sessao) => {
      atual = sessao;
    },
    limpar: () => {
      atual = null;
    },
  };
}

beforeEach(() => {
  carrinhoStorePersonalizado = undefined;
  pathnameAtual = "/";
  pushMock.mockClear();
  window.sessionStorage.removeItem("origem:test:gate:modo-acesso");
  sessionStoreMock = new SessionStore(criarSessaoStorageFake(null));
});
afterEach(() => vi.unstubAllGlobals());

it("falha ao sincronizar carrinho no login aparece com recuperacao na vitrine", async () => {
  const { HttpCarrinhoService } =
    await import("@/services/http/carrinho.service");
  sessionStoreMock = new SessionStore(
    criarSessaoStorageFake({
      id: "u1",
      nome: "Ana",
      email: "u1@origem.test",
      papel: "comprador",
    }),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => Response.json({}, { status: 503 })),
  );
  carrinhoStorePersonalizado = new CartStore(null, new HttpCarrinhoService());
  await carrinhoStorePersonalizado.hidratar().catch(() => {});
  render(
    <GateAcesso>
      <div>Vitrine</div>
    </GateAcesso>,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    /serviço indisponível/i,
  );
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () =>
      Response.json({
        itens: [],
        total: 0,
        atualizadoEm: "2026-10-14T00:00:00.000Z",
      }),
    ),
  );
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Tentar novamente" }));
  await waitFor(() =>
    expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
  );
});

describe("GateAcesso", () => {
  it("sem sessao e sem escolha previa, mostra a tela Entrar como e nao renderiza o conteudo", async () => {
    render(
      <GateAcesso>
        <div>Conteudo da aplicacao</div>
      </GateAcesso>,
    );

    expect(
      await screen.findByRole("heading", { name: /peças feitas à mão/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Conteudo da aplicacao")).not.toBeInTheDocument();
  });

  it("clicar em continuar como visitante grava a escolha e libera o conteudo", async () => {
    const usuario = userEvent.setup();
    render(
      <GateAcesso>
        <div>Conteudo da aplicacao</div>
      </GateAcesso>,
    );

    await usuario.click(
      await screen.findByRole("button", { name: /continuar como visitante/i }),
    );

    expect(
      await screen.findByText("Conteudo da aplicacao"),
    ).toBeInTheDocument();
    expect(
      window.sessionStorage.getItem("origem:test:gate:modo-acesso"),
    ).not.toBeNull();
  });

  it("usuario ja autenticado pula a tela de escolha e ve o conteudo direto", async () => {
    sessionStoreMock = new SessionStore(
      criarSessaoStorageFake({
        id: "u1",
        nome: "Ana",
        email: "u1@origem.test",
        papel: "comprador",
      }),
    );

    render(
      <GateAcesso>
        <div>Conteudo da aplicacao</div>
      </GateAcesso>,
    );

    expect(
      await screen.findByText("Conteudo da aplicacao"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /peças feitas à mão/i }),
    ).not.toBeInTheDocument();
  });

  it("escolha de visitante anterior (mesma aba) libera o conteudo sem mostrar a tela de novo", async () => {
    window.sessionStorage.setItem("origem:test:gate:modo-acesso", "visitante");

    render(
      <GateAcesso>
        <div>Conteudo da aplicacao</div>
      </GateAcesso>,
    );

    expect(
      await screen.findByText("Conteudo da aplicacao"),
    ).toBeInTheDocument();
  });

  it("clicar em sair pede confirmacao antes de deslogar", async () => {
    sessionStoreMock = new SessionStore(
      criarSessaoStorageFake({
        id: "u1",
        nome: "Ana",
        email: "u1@origem.test",
        papel: "comprador",
      }),
    );
    const usuario = userEvent.setup();

    render(
      <GateAcesso>
        <div>Conteudo da aplicacao</div>
      </GateAcesso>,
    );

    await usuario.click(await screen.findByRole("button", { name: /^sair$/i }));

    expect(screen.getByText(/tem certeza que quer sair/i)).toBeInTheDocument();
    expect(screen.getByText("Conteudo da aplicacao")).toBeInTheDocument();
  });

  it("cancelar a confirmacao mantem a sessao ativa", async () => {
    sessionStoreMock = new SessionStore(
      criarSessaoStorageFake({
        id: "u1",
        nome: "Ana",
        email: "u1@origem.test",
        papel: "comprador",
      }),
    );
    const usuario = userEvent.setup();

    render(
      <GateAcesso>
        <div>Conteudo da aplicacao</div>
      </GateAcesso>,
    );

    await usuario.click(await screen.findByRole("button", { name: /^sair$/i }));
    await usuario.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(
      screen.queryByText(/tem certeza que quer sair/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Conteudo da aplicacao")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sair$/i })).toBeInTheDocument();
  });

  it("confirmar a saida desloga e volta a pedir a escolha", async () => {
    sessionStoreMock = new SessionStore(
      criarSessaoStorageFake({
        id: "u1",
        nome: "Ana",
        email: "u1@origem.test",
        papel: "comprador",
      }),
    );
    const usuario = userEvent.setup();

    render(
      <GateAcesso>
        <div>Conteudo da aplicacao</div>
      </GateAcesso>,
    );

    await usuario.click(await screen.findByRole("button", { name: /^sair$/i }));
    await usuario.click(screen.getByRole("button", { name: /sim, sair/i }));

    expect(
      await screen.findByRole("heading", { name: /peças feitas à mão/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Conteudo da aplicacao")).not.toBeInTheDocument();
  });

  it("confirmar a saida a partir do carrinho redireciona para a vitrine", async () => {
    pathnameAtual = "/carrinho";
    sessionStoreMock = new SessionStore(
      criarSessaoStorageFake({
        id: "u1",
        nome: "Ana",
        email: "u1@origem.test",
        papel: "comprador",
      }),
    );
    const usuario = userEvent.setup();

    render(
      <GateAcesso>
        <div>Conteudo do carrinho</div>
      </GateAcesso>,
    );

    await usuario.click(await screen.findByRole("button", { name: /^sair$/i }));
    await usuario.click(screen.getByRole("button", { name: /sim, sair/i }));

    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("artesao autenticado ve links para o painel e para meus produtos", async () => {
    sessionStoreMock = new SessionStore(
      criarSessaoStorageFake({
        id: "u1",
        nome: "Bia",
        email: "u1@origem.test",
        papel: "artesao",
      }),
    );

    render(
      <GateAcesso>
        <div>Conteudo da aplicacao</div>
      </GateAcesso>,
    );

    expect(
      await screen.findByRole("link", { name: /painel do artesão/i }),
    ).toHaveAttribute("href", "/painel-artesao");
    expect(
      screen.getByRole("link", { name: /meus produtos/i }),
    ).toHaveAttribute("href", "/painel-artesao/produtos");
    expect(screen.getByRole("link", { name: /^vitrine$/i })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.queryByRole("link", { name: /painel admin/i }),
    ).not.toBeInTheDocument();
  });

  it("admin autenticado ve link para o painel administrativo", async () => {
    sessionStoreMock = new SessionStore(
      criarSessaoStorageFake({
        id: "u1",
        nome: "Caio",
        email: "u1@origem.test",
        papel: "admin",
      }),
    );

    render(
      <GateAcesso>
        <div>Conteudo da aplicacao</div>
      </GateAcesso>,
    );

    expect(
      await screen.findByRole("link", { name: /painel admin/i }),
    ).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: /^vitrine$/i })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.queryByRole("link", { name: /meus produtos/i }),
    ).not.toBeInTheDocument();
  });

  it("comprador autenticado nao ve links de artesao nem de admin", async () => {
    sessionStoreMock = new SessionStore(
      criarSessaoStorageFake({
        id: "u1",
        nome: "Ana",
        email: "u1@origem.test",
        papel: "comprador",
      }),
    );

    render(
      <GateAcesso>
        <div>Conteudo da aplicacao</div>
      </GateAcesso>,
    );

    await screen.findByText("Ana");
    expect(screen.getByText("Comprador")).toBeInTheDocument();
    expect(screen.queryByText(/\(comprador\)/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /painel do artesão/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /painel admin/i }),
    ).not.toBeInTheDocument();
  });

  it("visitante ve a opcao de entrar", async () => {
    window.sessionStorage.setItem("origem:test:gate:modo-acesso", "visitante");

    render(
      <GateAcesso>
        <div>Conteudo da aplicacao</div>
      </GateAcesso>,
    );

    expect(
      await screen.findByRole("button", { name: /^entrar$/i }),
    ).toBeInTheDocument();
  });

  it("visitante clica em entrar e ve as 3 opcoes de papel para login", async () => {
    window.sessionStorage.setItem("origem:test:gate:modo-acesso", "visitante");
    const usuario = userEvent.setup();

    render(
      <GateAcesso>
        <div>Conteudo da aplicacao</div>
      </GateAcesso>,
    );

    await usuario.click(
      await screen.findByRole("button", { name: /^entrar$/i }),
    );

    expect(
      screen.getByRole("link", { name: /comprador/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /artesão/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /administrador/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Conteudo da aplicacao")).toBeInTheDocument();
  });

  it("na pagina de login, mostra o conteudo mesmo sem sessao e sem ter escolhido visitante", async () => {
    pathnameAtual = "/login";

    render(
      <GateAcesso>
        <div>Formulario de login</div>
      </GateAcesso>,
    );

    expect(await screen.findByText("Formulario de login")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /peças feitas à mão/i }),
    ).not.toBeInTheDocument();
  });

  it("nao mostra a barra de conta na propria pagina de login", async () => {
    pathnameAtual = "/login";
    window.sessionStorage.setItem("origem:test:gate:modo-acesso", "visitante");

    render(
      <GateAcesso>
        <div>Conteudo da aplicacao</div>
      </GateAcesso>,
    );

    await screen.findByText("Conteudo da aplicacao");
    expect(
      screen.queryByRole("link", { name: /entrar/i }),
    ).not.toBeInTheDocument();
  });

  it("na pagina de cadastro, mostra o formulario sem sessao e sem a barra de conta", async () => {
    pathnameAtual = "/cadastro";

    render(
      <GateAcesso>
        <div>Formulario de cadastro</div>
      </GateAcesso>,
    );

    expect(
      await screen.findByText("Formulario de cadastro"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /peças feitas à mão/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^entrar$/i }),
    ).not.toBeInTheDocument();
  });

  it("a tela de escolha leva comprador, artesao e administrador ao login", async () => {
    render(
      <GateAcesso>
        <div>Conteudo da aplicacao</div>
      </GateAcesso>,
    );

    for (const papel of [
      /entrar como comprador/i,
      /entrar como artesão/i,
      /entrar como administrador/i,
    ]) {
      expect(await screen.findByRole("link", { name: papel })).toHaveAttribute(
        "href",
        "/login",
      );
    }
  });
});

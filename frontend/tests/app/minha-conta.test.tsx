import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionStore } from "@/store/sessao.store";
import type { SessaoStorage } from "@/fake-api/storage/sessao.storage";
import type { UsuarioSessao } from "@/types/sessao";
import { HttpPedidosService } from "@/services/http/pedidos.service";
import { HttpAvaliacoesService } from "@/services/http/avaliacoes.service";

const pushMock = vi.fn();
const replaceMock = vi.fn();
let storeMock: SessionStore;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  usePathname: () => "/minha-conta",
}));

vi.mock("@/services/fake/container", () => ({
  obterSessionStore: () => storeMock,
  obterPedidosService: () => new HttpPedidosService(),
  obterAvaliacoesService: () => new HttpAvaliacoesService(),
}));

function criarStore(sessao: UsuarioSessao | null): SessionStore {
  let atual = sessao;
  const storage: SessaoStorage = {
    ler: () => atual,
    salvar: (nova) => {
      atual = nova;
    },
    limpar: () => {
      atual = null;
    },
  };
  return new SessionStore(storage);
}

async function renderizarPagina() {
  const { default: MinhaContaPage } = await import("@/app/minha-conta/page");
  render(<MinhaContaPage />);
}

beforeEach(() => {
  pushMock.mockClear();
  replaceMock.mockClear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ itens: [], pagina: 1, limite: 10, total: 0 }),
    ),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Minha conta", () => {
  it("mostra nome, e-mail e papel do usuario da sessao", async () => {
    storeMock = criarStore({
      id: "u1",
      nome: "Maria Artesã",
      email: "maria@email.com",
      papel: "artesao",
    });

    await renderizarPagina();

    expect(
      await screen.findByRole("heading", { name: "Minha conta" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Maria Artesã")).toBeInTheDocument();
    expect(screen.getByText("maria@email.com")).toBeInTheDocument();
    expect(screen.getByText("Artesão")).toBeInTheDocument();
  });

  it("mostra estado vazio em Meus pedidos", async () => {
    storeMock = criarStore({
      id: "u1",
      nome: "Ana",
      email: "ana@email.com",
      papel: "comprador",
    });

    await renderizarPagina();

    expect(
      await screen.findByRole("heading", { name: "Meus pedidos" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Seus pedidos vão aparecer aqui"),
    ).toBeInTheDocument();
  });

  it("rotula o papel admin como Administrador", async () => {
    storeMock = criarStore({
      id: "u9",
      nome: "Admin",
      email: "admin@email.com",
      papel: "admin",
    });

    await renderizarPagina();

    expect(await screen.findByText("Administrador")).toBeInTheDocument();
  });

  it("sair encerra a sessao e volta para a vitrine", async () => {
    const user = userEvent.setup();
    storeMock = criarStore({
      id: "u1",
      nome: "Ana",
      email: "ana@email.com",
      papel: "comprador",
    });

    await renderizarPagina();
    await user.click(await screen.findByRole("button", { name: /sair/i }));

    expect(storeMock.getSnapshot()).toBeNull();
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
  });

  it("sem sessao redireciona para o login", async () => {
    storeMock = criarStore(null);

    await renderizarPagina();

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(
        "/login?redirect=%2Fminha-conta",
      ),
    );
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { SessionStore } from "@/store/sessao.store";
import type { UsuarioSessao } from "@/types/sessao";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => pathnameAtual,
}));

let pathnameAtual = "/painel-artesao";
let storeMock: SessionStore | null = null;

vi.mock("@/services/fake/container", () => ({
  obterSessionStore: () => storeMock,
  obterProdutosService: () => ({ list: vi.fn(), create: vi.fn() }),
}));

function criarStoreFake(sessao: UsuarioSessao | null): SessionStore {
  return {
    getSnapshot: vi.fn().mockReturnValue(sessao),
    subscribe: vi.fn().mockReturnValue(() => {}),
  } as unknown as SessionStore;
}

beforeEach(() => {
  replaceMock.mockClear();
});

describe("protecao de rotas", () => {
  it("/painel-artesao nega visitante e preserva destino de retorno", async () => {
    pathnameAtual = "/painel-artesao";
    storeMock = criarStoreFake(null);
    const { default: PainelArtesaoPage } = await import("@/app/painel-artesao/page");

    render(<PainelArtesaoPage />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/login?redirect=%2Fpainel-artesao")
    );
  });

  it("/painel-artesao nega papel incorreto", async () => {
    pathnameAtual = "/painel-artesao";
    storeMock = criarStoreFake({ id: "u1", nome: "Ana", papel: "comprador" });
    const { default: PainelArtesaoPage } = await import("@/app/painel-artesao/page");

    render(<PainelArtesaoPage />);

    expect(await screen.findByText(/acesso negado/i)).toBeInTheDocument();
  });

  it("/painel-artesao aceita papel artesao", async () => {
    pathnameAtual = "/painel-artesao";
    storeMock = criarStoreFake({ id: "u2", nome: "Bia", papel: "artesao" });
    const { default: PainelArtesaoPage } = await import("@/app/painel-artesao/page");

    render(<PainelArtesaoPage />);

    expect(await screen.findByRole("heading")).toBeInTheDocument();
  });

  it("/admin nega visitante e preserva destino de retorno", async () => {
    pathnameAtual = "/admin";
    storeMock = criarStoreFake(null);
    const { default: AdminPage } = await import("@/app/admin/page");

    render(<AdminPage />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/login?redirect=%2Fadmin")
    );
  });

  it("/admin nega papel incorreto", async () => {
    pathnameAtual = "/admin";
    storeMock = criarStoreFake({ id: "u3", nome: "Caio", papel: "artesao" });
    const { default: AdminPage } = await import("@/app/admin/page");

    render(<AdminPage />);

    expect(await screen.findByText(/acesso negado/i)).toBeInTheDocument();
  });

  it("/admin aceita papel admin", async () => {
    pathnameAtual = "/admin";
    storeMock = criarStoreFake({ id: "u4", nome: "Dora", papel: "admin" });
    const { default: AdminPage } = await import("@/app/admin/page");

    render(<AdminPage />);

    expect(await screen.findByRole("heading")).toBeInTheDocument();
  });

  it("/minha-conta nega visitante e preserva destino de retorno", async () => {
    pathnameAtual = "/minha-conta";
    storeMock = criarStoreFake(null);
    const { default: MinhaContaPage } = await import("@/app/minha-conta/page");

    render(<MinhaContaPage />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/login?redirect=%2Fminha-conta")
    );
  });

  it("/minha-conta aceita qualquer papel autenticado", async () => {
    pathnameAtual = "/minha-conta";
    storeMock = criarStoreFake({ id: "u5", nome: "Elis", papel: "comprador" });
    const { default: MinhaContaPage } = await import("@/app/minha-conta/page");

    render(<MinhaContaPage />);

    expect(await screen.findByRole("heading")).toBeInTheDocument();
  });
});

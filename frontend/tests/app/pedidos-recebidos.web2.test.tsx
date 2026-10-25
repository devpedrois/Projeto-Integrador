import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import Page from "@/app/painel-artesao/pedidos/page";
import { SessionStore } from "@/store/sessao.store";
import { HttpPedidosArtesaoService } from "@/services/http/pedidos-artesao.service";

const store = new SessionStore(null);
const service = new HttpPedidosArtesaoService();
vi.mock("next/navigation", () => ({
  usePathname: () => "/painel-artesao/pedidos",
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("@/services/fake/container", () => ({
  obterSessionStore: () => store,
  obterPedidosArtesaoService: () => service,
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("descarta pedidos anteriores quando a conta do artesao muda", async () => {
  const sessao = {
    id: "artesao-a",
    nome: "Artesao A",
    email: "a@teste.origem",
    papel: "artesao" as const,
  };
  store.login(sessao);
  let nome = "Produto A";
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        limit: 10,
        offset: 0,
        total: 1,
        itens: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            numero: "ORG-2026-000001",
            criadoEm: "2026-10-25T12:00:00.000Z",
            nomeComprador: "Comprador",
            subtotalArtesao: 10,
            itens: [
              {
                id: "22222222-2222-4222-8222-222222222222",
                nome,
                produtoId: "33333333-3333-4333-8333-333333333333",
                quantidade: 1,
                precoUnitario: 10,
                subtotal: 10,
                status: "aguardando_envio",
                enviadoEm: null,
              },
            ],
          },
        ],
      }),
    ),
  );
  render(<Page />);
  expect(await screen.findByText("Produto A")).toBeInTheDocument();
  nome = "Produto B";
  act(() => store.login({ ...sessao, id: "artesao-b", nome: "Artesao B" }));
  expect(await screen.findByText("Produto B")).toBeInTheDocument();
  expect(screen.queryByText("Produto A")).not.toBeInTheDocument();
});

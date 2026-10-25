import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SessionStore } from "@/store/sessao.store";
import Page from "@/app/painel-artesao/page";

const store = new SessionStore(null);
vi.mock("next/navigation", () => ({
  usePathname: () => "/painel-artesao",
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("@/services/fake/container", async (original) => ({
  ...(await original<typeof import("@/services/fake/container")>()),
  obterSessionStore: () => store,
}));
beforeEach(() => vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http"));
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("integra card ao painel e descarta dados da conta anterior", async () => {
  const sessao = {
    id: "11111111-1111-4111-8111-111111111111",
    nome: "Artesao A",
    email: "a@teste.origem",
    papel: "artesao" as const,
  };
  store.login(sessao);
  let receitaTotal = 51.83;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/artesao/indicadores")
        return Response.json({
          quantidadeVendida: 10,
          receitaTotal,
          numeroPedidos: 2,
          ultimaVenda: "2026-10-13T12:00:00.000Z",
          atualizadoEm: "2026-10-25T12:00:00.000Z",
        });
      return Response.json([]);
    }),
  );
  render(<Page />);
  const card = await screen.findByRole("region", {
    name: "Indicadores de vendas",
  });
  expect(await within(card).findByText(/51,83/)).toBeInTheDocument();
  receitaTotal = 100;
  act(() =>
    store.login({ ...sessao, id: "22222222-2222-4222-8222-222222222222" }),
  );
  const novoCard = await screen.findByRole("region", {
    name: "Indicadores de vendas",
  });
  expect(await within(novoCard).findByText(/100,00/)).toBeInTheDocument();
  expect(within(novoCard).queryByText(/51,83/)).not.toBeInTheDocument();
});

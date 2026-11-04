import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Page from "@/app/admin/page";
import { SessionStore } from "@/store/sessao.store";

const store = new SessionStore(null);
const sessao = {
  id: "11111111-1111-4111-8111-111111111111",
  nome: "Admin sintetico",
  email: "admin@teste.origem",
  papel: "admin" as const,
};
const dados = {
  artesaosAtivos: 3,
  produtosAtivos: 3,
  pedidosConfirmados: 4,
  receitaTotal: "100000000.29",
  atualizadoEm: "2026-11-04T12:00:00.000Z",
};
let resposta: () => Promise<Response>;

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("@/services/fake/container", async (original) => ({
  ...(await original<typeof import("@/services/fake/container")>()),
  obterSessionStore: () => store,
}));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http");
  store.login(sessao);
  resposta = async () => Response.json(dados);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/admin/indicadores") return resposta();
      return Response.json([]);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function card() {
  return screen.getByRole("region", { name: "Indicadores da plataforma" });
}

it("mostra carregamento sem antecipar valores", async () => {
  let resolver!: (response: Response) => void;
  resposta = () =>
    new Promise((resolve) => {
      resolver = resolve;
    });
  render(<Page />);
  expect(within(card()).getByRole("status")).toHaveTextContent(
    "Carregando indicadores",
  );
  expect(within(card()).queryByText("Receita total")).not.toBeInTheDocument();
  await act(async () => resolver(Response.json(dados)));
  expect(
    await within(card()).findByText(/100\.000\.000,29/),
  ).toBeInTheDocument();
});

it("mostra quatro indicadores e data atualizada com formatacao pt-BR", async () => {
  render(<Page />);
  expect(
    await within(card()).findByText("Pedidos confirmados"),
  ).toBeInTheDocument();
  const valores = card().querySelectorAll("dd");
  expect(
    Array.from(valores, (item) => item.textContent?.replace(/\s/g, " ")),
  ).toEqual(["3", "3", "4", "R$ 100.000.000,29"]);
  expect(card().querySelector("time")).toHaveAttribute(
    "datetime",
    dados.atualizadoEm,
  );
  expect(card().querySelector("time")).toHaveTextContent("04/11/2026, 09:00");
  expect(
    within(card()).queryByText("Nenhuma atividade registrada ainda."),
  ).not.toBeInTheDocument();
});

it("mostra vazio com quatro zeros e data", async () => {
  resposta = async () =>
    Response.json({
      ...dados,
      artesaosAtivos: 0,
      produtosAtivos: 0,
      pedidosConfirmados: 0,
      receitaTotal: "0.00",
    });
  render(<Page />);
  expect(
    await within(card()).findByText("Nenhuma atividade registrada ainda."),
  ).toBeInTheDocument();
  expect(within(card()).getByText(/R\$\s*0,00/)).toBeInTheDocument();
  expect(card().querySelectorAll("dd")).toHaveLength(4);
  expect(card().querySelector("time")).toBeInTheDocument();
});

it("considera cadastro sem pedidos como sucesso", async () => {
  resposta = async () =>
    Response.json({ ...dados, pedidosConfirmados: 0, receitaTotal: "0.00" });
  render(<Page />);
  expect(
    await within(card()).findByText("Artesãos ativos"),
  ).toBeInTheDocument();
  expect(
    within(card()).queryByText("Nenhuma atividade registrada ainda."),
  ).not.toBeInTheDocument();
});

it("permite tentar novamente depois do erro", async () => {
  resposta = async () => Response.json({}, { status: 503 });
  render(<Page />);
  expect(await within(card()).findByRole("alert")).toHaveTextContent(
    "Não foi possível carregar os indicadores.",
  );
  resposta = async () => Response.json(dados);
  await userEvent.click(
    within(card()).getByRole("button", { name: "Tentar novamente" }),
  );
  expect(
    await within(card()).findByText(/100\.000\.000,29/),
  ).toBeInTheDocument();
});

it("preserva centavos de receitas maiores que Number.MAX_SAFE_INTEGER", async () => {
  resposta = async () =>
    Response.json({ ...dados, receitaTotal: "9007199254740993.29" });
  render(<Page />);
  expect(
    await within(card()).findByText(/9\.007\.199\.254\.740\.993,29/),
  ).toBeInTheDocument();
});

it("descarta resposta pendente ao trocar de conta", async () => {
  let resolver!: (response: Response) => void;
  resposta = () =>
    new Promise((resolve) => {
      resolver = resolve;
    });
  render(<Page />);
  expect(within(card()).getByRole("status")).toBeInTheDocument();
  resposta = async () => Response.json({ ...dados, receitaTotal: "20.00" });
  act(() =>
    store.login({ ...sessao, id: "22222222-2222-4222-8222-222222222222" }),
  );
  expect(await within(card()).findByText(/R\$\s*20,00/)).toBeInTheDocument();
  await act(async () => resolver(Response.json(dados)));
  expect(
    within(card()).queryByText(/100\.000\.000,29/),
  ).not.toBeInTheDocument();
});

it.each(["comprador", "artesao"] as const)(
  "oculta indicadores de %s",
  (papel) => {
    store.login({ ...sessao, papel });
    render(<Page />);
    expect(
      screen.queryByRole("region", { name: "Indicadores da plataforma" }),
    ).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  },
);

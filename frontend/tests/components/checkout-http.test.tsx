import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/checkout",
}));
const produtoId = "87e8b815-4817-4d00-bc7e-39bf04cf6901";
const compradorId = "86b2d28a-614b-47bf-8bf4-e8a8d74d472d";
const pedidoId = "9bed2251-514b-4d3b-812f-b0db7c11523a";
const criadoEm = "2026-10-14T12:00:00.000Z";
const confirmado = {
  pedido: {
    id: pedidoId,
    compradorId,
    numero: "ORG-2026-000123",
    status: "confirmado",
    total: 26.74,
    criadoEm,
  },
  itens: [
    {
      produtoId,
      nome: "Vaso atualizado",
      quantidade: 2,
      precoUnitario: 13.37,
      subtotal: 26.74,
    },
  ],
};
let falhar: boolean;
let concluido: boolean;
let falhaCarrinho: boolean;
let chamadas: { path: string; method: string; body?: unknown }[];
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http");
  window.localStorage.clear();
  falhar = false;
  concluido = false;
  falhaCarrinho = false;
  chamadas = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string, options: RequestInit) => {
      chamadas.push({
        path,
        method: options.method ?? "GET",
        body: options.body ? JSON.parse(String(options.body)) : undefined,
      });
      if (path === "/api/auth/me")
        return Response.json({
          id: compradorId,
          nome: "Ana",
          email: "ana@teste.origem",
          papel: "comprador",
        });
      if (path === "/api/carrinho" && falhaCarrinho)
        return Response.json({}, { status: 503 });
      if (path === "/api/carrinho")
        return Response.json({
          itens: concluido
            ? []
            : [
                {
                  produtoId,
                  nome: "Vaso sintetico",
                  quantidade: 2,
                  precoUnitario: 12.35,
                  estoqueDisponivel: 5,
                },
              ],
          total: concluido ? 0 : 24.7,
          atualizadoEm: criadoEm,
        });
      if (path === "/api/pedidos") {
        if (falhar)
          return Response.json(
            {
              error: {
                code: "ESTOQUE_INSUFICIENTE",
                details: { produtoId, nome: "Vaso atualizado" },
              },
            },
            { status: 409 },
          );
        concluido = true;
        return Response.json(confirmado, { status: 201 });
      }
      return Response.json(
        { error: { code: "PRODUTO_NAO_ENCONTRADO" } },
        { status: 404 },
      );
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function checkout() {
  const { default: CheckoutPage } = await import("@/app/checkout/page");
  render(<CheckoutPage />);
  return screen.findByRole("button", { name: "Confirmar pedido" });
}

it("confirma por HTTP, mostra numero real e limpa estado sem DELETE posterior", async () => {
  const button = await checkout();
  await userEvent.click(button);
  expect(await screen.findByText("ORG-2026-000123")).toBeInTheDocument();
  expect(chamadas.filter(({ path }) => path === "/api/pedidos")).toEqual([
    {
      path: "/api/pedidos",
      method: "POST",
      body: { itens: [{ produtoId, quantidade: 2 }] },
    },
  ]);
  expect(chamadas.some(({ method }) => method === "DELETE")).toBe(false);
  const container = await import("@/services/fake/container");
  expect(container.obterCarrinhoStore(compradorId).getSnapshot().itens).toEqual(
    [],
  );
  expect(container.PENDENTES_HTTP).not.toContain("PedidosService");
});

it("409 identifica o item e preserva carrinho para tentar novamente", async () => {
  falhar = true;
  const button = await checkout();
  await userEvent.click(button);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    'Estoque insuficiente para "Vaso atualizado".',
  );
  const container = await import("@/services/fake/container");
  expect(
    container.obterCarrinhoStore(compradorId).getSnapshot().itens,
  ).toHaveLength(1);
  falhar = false;
  await userEvent.click(button);
  expect(await screen.findByText("ORG-2026-000123")).toBeInTheDocument();
});

it("falha ao carregar carrinho oferece recuperacao no checkout", async () => {
  falhaCarrinho = true;
  const { default: CheckoutPage } = await import("@/app/checkout/page");
  render(<CheckoutPage />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Serviço indisponível",
  );
  expect(
    screen.queryByText("Seu carrinho está vazio."),
  ).not.toBeInTheDocument();
  falhaCarrinho = false;
  await userEvent.click(
    screen.getByRole("button", { name: "Tentar novamente" }),
  );
  expect(
    await screen.findByRole("button", { name: "Confirmar pedido" }),
  ).toBeInTheDocument();
});

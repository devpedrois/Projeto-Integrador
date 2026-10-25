import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { IndicadoresArtesaoCard } from "@/components/painel-artesao/IndicadoresArtesaoCard";
import { HttpIndicadoresArtesaoService } from "@/services/http/indicadores-artesao.service";

const dados = {
  quantidadeVendida: 10,
  receitaTotal: 51.83,
  numeroPedidos: 2,
  ultimaVenda: "2026-10-13T12:00:00.000Z",
  atualizadoEm: "2026-10-25T12:00:00.000Z",
};
const service = new HttpIndicadoresArtesaoService();
beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("mostra loading sem antecipar nenhuma venda", async () => {
  let resolver!: (r: Response) => void;
  vi.mocked(fetch).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolver = resolve;
      }),
  );
  render(<IndicadoresArtesaoCard service={service} />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "Carregando indicadores",
  );
  expect(screen.queryByText("Nenhuma venda ainda")).not.toBeInTheDocument();
  await act(async () => resolver(Response.json(dados)));
  expect(await screen.findByText(/51,83/)).toBeInTheDocument();
});

it("mostra quantidade, receita BRL, pedidos e instante retornados pela API", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(dados));
  render(<IndicadoresArtesaoCard service={service} />);
  const card = screen.getByRole("region", { name: "Indicadores de vendas" });
  expect(await within(card).findByText(/R\$\s*51,83/)).toBeInTheDocument();
  expect(
    within(card).getByText("Quantidade vendida").nextElementSibling,
  ).toHaveTextContent("10");
  expect(
    within(card).getByText("Pedidos").nextElementSibling,
  ).toHaveTextContent("2");
  const tempo = card.querySelector("time");
  expect(tempo).toHaveAttribute("datetime", dados.atualizadoEm);
  expect(tempo).toHaveTextContent("25/10/2026");
  expect(tempo).toHaveTextContent("09:00");
  expect(within(card).getByText(/Atualizado em/)).toBeInTheDocument();
});

it("mostra vazio somente depois da resposta sem pedidos", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({
      ...dados,
      quantidadeVendida: 0,
      receitaTotal: 0,
      numeroPedidos: 0,
      ultimaVenda: null,
    }),
  );
  render(<IndicadoresArtesaoCard service={service} />);
  expect(await screen.findByText("Nenhuma venda ainda")).toBeInTheDocument();
  expect(screen.getByText(/R\$\s*0,00/)).toBeInTheDocument();
  expect(screen.getByText(/Atualizado em/)).toBeInTheDocument();
});

it("recupera falha sem apresentar valores inventados", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({}, { status: 503 }));
  render(<IndicadoresArtesaoCard service={service} />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível carregar os indicadores",
  );
  expect(screen.queryByText("Nenhuma venda ainda")).not.toBeInTheDocument();
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(dados));
  await userEvent.click(
    screen.getByRole("button", { name: "Tentar novamente" }),
  );
  expect(await screen.findByText(/51,83/)).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("ignora resposta antiga quando muda o service", async () => {
  let resolver!: (r: Response) => void;
  vi.mocked(fetch).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolver = resolve;
      }),
  );
  const view = render(<IndicadoresArtesaoCard service={service} />);
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({ ...dados, receitaTotal: 100 }),
  );
  view.rerender(
    <IndicadoresArtesaoCard service={new HttpIndicadoresArtesaoService()} />,
  );
  expect(await screen.findByText(/100,00/)).toBeInTheDocument();
  await act(async () => resolver(Response.json(dados)));
  expect(screen.getByText(/100,00/)).toBeInTheDocument();
  expect(screen.queryByText(/51,83/)).not.toBeInTheDocument();
});

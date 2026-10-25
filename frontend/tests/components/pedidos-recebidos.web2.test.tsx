import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PedidosRecebidos } from "@/components/painel-artesao/PedidosRecebidos";
import { HttpPedidosArtesaoService } from "@/services/http/pedidos-artesao.service";

const id = "11111111-1111-4111-8111-111111111111";
const item = {
  id,
  produtoId: "22222222-2222-4222-8222-222222222222",
  nome: "Vaso artesanal",
  quantidade: 2,
  precoUnitario: 10,
  subtotal: 20,
  status: "aguardando_envio",
  enviadoEm: null,
};
const pedido = {
  id: "33333333-3333-4333-8333-333333333333",
  numero: "ORG-2026-000001",
  criadoEm: "2026-10-25T12:00:00.000Z",
  nomeComprador: "Ana sintetica",
  itens: [item],
  subtotalArtesao: 20,
};
const pagina = { itens: [pedido], limit: 10, offset: 0, total: 1 };
const enviado = {
  id,
  status: "enviado",
  enviadoEm: "2026-10-25T13:00:00.000Z",
};
const abrir = () =>
  render(<PedidosRecebidos service={new HttpPedidosArtesaoService()} />);
beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("mostra carregando, lista e dados sem consultar storage local", async () => {
  let resolver!: (r: Response) => void;
  vi.mocked(fetch).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolver = resolve;
      }),
  );
  abrir();
  expect(screen.getByRole("status")).toHaveTextContent("Carregando pedidos");
  await act(async () => resolver(Response.json(pagina)));
  expect(await screen.findByText("Ana sintetica")).toBeInTheDocument();
  expect(screen.getByText("Vaso artesanal")).toBeInTheDocument();
  expect(screen.getByText("Aguardando envio")).toBeInTheDocument();
});

it("exige confirmacao e permite cancelar antes do PATCH", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(pagina));
  abrir();
  await userEvent.click(
    await screen.findByRole("button", { name: "Marcar como enviado" }),
  );
  expect(
    screen.getByRole("group", { name: "Confirmar envio de Vaso artesanal" }),
  ).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(
    screen.queryByRole("button", { name: "Confirmar envio" }),
  ).not.toBeInTheDocument();
});

it("confirma envio uma vez, bloqueia duplo clique e mostra enviado", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(pagina));
  abrir();
  await userEvent.click(
    await screen.findByRole("button", { name: "Marcar como enviado" }),
  );
  let resolver!: (r: Response) => void;
  vi.mocked(fetch).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolver = resolve;
      }),
  );
  await userEvent.dblClick(
    screen.getByRole("button", { name: "Confirmar envio" }),
  );
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("button", { name: "Salvando…" })).toBeDisabled();
  await act(async () => resolver(Response.json(enviado)));
  expect(await screen.findByText("Enviado")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Marcar como enviado" }),
  ).not.toBeInTheDocument();
  expect(fetch).toHaveBeenLastCalledWith(
    `/api/artesao/itens-pedido/${id}/enviar`,
    expect.objectContaining({
      method: "PATCH",
      credentials: "include",
      cache: "no-store",
    }),
  );
});

it("recupera falha de leitura e mostra vazio", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({}, { status: 503 }));
  abrir();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível carregar",
  );
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({ ...pagina, itens: [], total: 0 }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Tentar novamente" }),
  );
  expect(
    await screen.findByText("Nenhum pedido recebido."),
  ).toBeInTheDocument();
});

it("mantem confirmacao apos erro de envio e permite repetir", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(pagina));
  abrir();
  await userEvent.click(
    await screen.findByRole("button", { name: "Marcar como enviado" }),
  );
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({}, { status: 503 }));
  await userEvent.click(
    screen.getByRole("button", { name: "Confirmar envio" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível marcar",
  );
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(enviado));
  await userEvent.click(
    screen.getByRole("button", { name: "Confirmar envio" }),
  );
  expect(await screen.findByText("Enviado")).toBeInTheDocument();
});

it("reconsulta estado autoritativo quando outro envio vence", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(pagina));
  abrir();
  await userEvent.click(
    await screen.findByRole("button", { name: "Marcar como enviado" }),
  );
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({ error: { code: "ITEM_JA_ENVIADO" } }, { status: 409 }),
  );
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({
      ...pagina,
      itens: [{ ...pedido, itens: [{ ...item, ...enviado }] }],
    }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Confirmar envio" }),
  );
  expect(await screen.findByText("Enviado")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Marcar como enviado" }),
  ).not.toBeInTheDocument();
});

it("pagina pedidos usando limit e offset", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({ ...pagina, total: 11 }),
  );
  abrir();
  const proxima = await screen.findByRole("button", { name: "Próxima página" });
  expect(
    screen.getByRole("button", { name: "Página anterior" }),
  ).toBeDisabled();
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({ ...pagina, offset: 10, total: 11 }),
  );
  await userEvent.click(proxima);
  expect(await screen.findByText("Página 2")).toBeInTheDocument();
  expect(fetch).toHaveBeenLastCalledWith(
    "/api/artesao/pedidos?limit=10&offset=10",
    expect.anything(),
  );
});

it.each([
  {
    ...pagina,
    itens: [{ ...pedido, itens: [{ ...item, status: "inventado" }] }],
  },
  {
    ...pagina,
    itens: [{ ...pedido, itens: [{ ...item, status: "enviado" }] }],
  },
  {
    ...pagina,
    itens: [{ ...pedido, itens: [{ ...item, enviadoEm: "2026-10-25" }] }],
  },
  { ...pagina, total: -1 },
])("rejeita resposta invalida antes de mostrar acao: %#", async (dados) => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(dados));
  abrir();
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Marcar como enviado" }),
  ).not.toBeInTheDocument();
});

it("nao consulta servidor com identificador de envio invalido", async () => {
  await expect(
    new HttpPedidosArtesaoService().enviar("../outro"),
  ).rejects.toMatchObject({ code: "ENTRADA_INVALIDA" });
  expect(fetch).not.toHaveBeenCalled();
});

it("rejeita confirmacao de envio de outro item", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({ ...enviado, id: pedido.id }),
  );
  await expect(
    new HttpPedidosArtesaoService().enviar(id),
  ).rejects.toMatchObject({ code: "RESPOSTA_INVALIDA" });
});

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ResumoConta } from "@/components/minha-conta/ResumoConta";
import { SessionStore } from "@/store/sessao.store";
import { HttpPedidosService } from "@/services/http/pedidos.service";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const id = "11111111-1111-4111-8111-111111111111";
const resumo = {
  id,
  numero: "ORG-2026-000001",
  status: "confirmado",
  total: 26.74,
  criadoEm: "2026-10-14T12:00:00.000Z",
  pagamento: {
    id: "22222222-2222-4222-8222-222222222222",
    metodo: "pix_simulado",
    status: "aprovado",
    valor: 26.74,
    dataPagamento: "2026-10-14T12:00:00.000Z",
  },
};
const listagem = { itens: [resumo], pagina: 1, limite: 10, total: 1 };
function conta(papel: "comprador" | "artesao" = "comprador") {
  const store = new SessionStore(null);
  store.login({
    id: "comprador-1",
    nome: "Ana",
    email: "ana@teste.origem",
    papel,
  });
  return render(
    <ResumoConta
      sessionStore={store}
      pedidosService={new HttpPedidosService()}
    />,
  );
}
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("mostra loading sem anunciar estado vazio prematuramente", () => {
  vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
  conta();
  expect(screen.getByRole("status")).toHaveTextContent("Carregando pedidos");
  expect(
    screen.queryByText("Seus pedidos vão aparecer aqui"),
  ).not.toBeInTheDocument();
});

it("mostra vazio apos carregar lista vazia", async () => {
  vi.mocked(fetch).mockResolvedValue(
    Response.json({ itens: [], pagina: 1, limite: 10, total: 0 }),
  );
  conta();
  expect(
    await screen.findByText("Seus pedidos vão aparecer aqui"),
  ).toBeInTheDocument();
  expect(
    screen.queryByText(/ainda está sendo preparada/),
  ).not.toBeInTheDocument();
});

it("mostra lista, detalhe, itens e pagamento", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(listagem));
  conta();
  const button = await screen.findByRole("button", {
    name: "Ver pedido ORG-2026-000001",
  });
  expect(screen.getByText("Confirmado")).toBeInTheDocument();
  expect(screen.getByText("Pagamento aprovado")).toBeInTheDocument();
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({
      pedido: {
        id,
        compradorId: "comprador-1",
        numero: resumo.numero,
        status: "confirmado",
        total: 26.74,
        criadoEm: resumo.criadoEm,
      },
      itens: [
        {
          produtoId: "produto-1",
          id: "55555555-5555-4555-8555-555555555555",
          status: "aguardando_envio",
          enviadoEm: null,
          nome: "Vaso artesanal",
          quantidade: 2,
          precoUnitario: 13.37,
          subtotal: 26.74,
        },
      ],
      pagamento: resumo.pagamento,
    }),
  );
  await userEvent.click(button);
  const detalhe = await screen.findByRole("region", {
    name: "Detalhe do pedido",
  });
  expect(within(detalhe).getByText("Vaso artesanal")).toBeInTheDocument();
  expect(within(detalhe).getByText(/13,37/)).toBeInTheDocument();
  expect(within(detalhe).getByText("Pix simulado")).toBeInTheDocument();
  expect(within(detalhe).getByText("Pagamento aprovado")).toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("button", { name: "Voltar aos pedidos" }),
  );
  expect(
    screen.queryByRole("region", { name: "Detalhe do pedido" }),
  ).not.toBeInTheDocument();
});

it("recupera erro da lista ao tentar novamente", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({}, { status: 503 }));
  conta();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível carregar seus pedidos",
  );
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(listagem));
  await userEvent.click(
    screen.getByRole("button", { name: "Tentar novamente" }),
  );
  expect(
    await screen.findByRole("button", { name: "Ver pedido ORG-2026-000001" }),
  ).toBeInTheDocument();
});

it("detalhe mostra loading e erro 404 recuperavel", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(listagem));
  conta();
  const button = await screen.findByRole("button", {
    name: "Ver pedido ORG-2026-000001",
  });
  let resolver!: (value: Response) => void;
  vi.mocked(fetch).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolver = resolve;
      }),
  );
  await userEvent.click(button);
  expect(screen.getByRole("status")).toHaveTextContent("Carregando pedido");
  resolver(
    Response.json(
      { error: { code: "PEDIDO_NAO_ENCONTRADO" } },
      { status: 404 },
    ),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Pedido não encontrado",
  );
  expect(
    screen.getByRole("button", { name: "Tentar novamente" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Voltar aos pedidos" }),
  ).toBeInTheDocument();
});

it("pagina os pedidos sem solicitar o detalhe de cada linha", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({ ...listagem, total: 11 }),
  );
  conta();
  const proxima = await screen.findByRole("button", { name: "Próxima página" });
  expect(
    screen.getByRole("button", { name: "Página anterior" }),
  ).toBeDisabled();
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({ ...listagem, pagina: 2, total: 11 }),
  );
  await userEvent.click(proxima);
  expect(await screen.findByText("Página 2 de 2")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch).toHaveBeenLastCalledWith(
    "/api/pedidos?pagina=2&limite=10",
    expect.anything(),
  );
});

it("artesao nao consulta historico de comprador", () => {
  conta("artesao");
  expect(fetch).not.toHaveBeenCalled();
  expect(
    screen.queryByRole("heading", { name: "Meus pedidos" }),
  ).not.toBeInTheDocument();
});

it("atualiza status do item no detalhe sem refazer login", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(listagem));
  conta();
  const item = {
    id: "55555555-5555-4555-8555-555555555555",
    produtoId: "produto-1",
    nome: "Vaso artesanal",
    quantidade: 2,
    precoUnitario: 13.37,
    subtotal: 26.74,
    status: "aguardando_envio",
    enviadoEm: null,
  };
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({
      pedido: resumo,
      pagamento: resumo.pagamento,
      itens: [item],
    }),
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "Ver pedido ORG-2026-000001" }),
  );
  expect(await screen.findByText("Aguardando envio")).toBeInTheDocument();
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({
      pedido: resumo,
      pagamento: resumo.pagamento,
      itens: [
        { ...item, status: "enviado", enviadoEm: "2026-10-25T12:00:00.000Z" },
      ],
    }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Atualizar pedido" }),
  );
  expect(await screen.findByText("Enviado")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(3);
});

it("diferencia pedido pendente e cancelado e pagamento recusado", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({
      itens: [
        { ...resumo, status: "pendente", pagamento: null },
        {
          ...resumo,
          id: "33333333-3333-4333-8333-333333333333",
          numero: "ORG-2026-000002",
          status: "cancelado",
          pagamento: { ...resumo.pagamento, status: "recusado" },
        },
      ],
      pagina: 1,
      limite: 10,
      total: 2,
    }),
  );
  conta();
  expect(await screen.findByText("Pendente")).toBeInTheDocument();
  expect(screen.getByText("Cancelado")).toBeInTheDocument();
  expect(screen.getByText("Pagamento recusado")).toBeInTheDocument();
  expect(screen.getByText("Sem pagamento registrado")).toBeInTheDocument();
});

import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HttpPedidosService } from "@/services/http/pedidos.service";

const id = "11111111-1111-4111-8111-111111111111";
const resumo = {
  id,
  numero: "ORG-2026-000001",
  status: "cancelado",
  total: 26.74,
  criadoEm: "2026-10-14T12:00:00.000Z",
  pagamento: {
    id: "22222222-2222-4222-8222-222222222222",
    metodo: "pix_simulado",
    status: "recusado",
    valor: 26.74,
    dataPagamento: "2026-10-14T12:00:00.000Z",
  },
};
const detalhe = {
  pedido: {
    id,
    compradorId: "33333333-3333-4333-8333-333333333333",
    numero: resumo.numero,
    status: resumo.status,
    total: resumo.total,
    criadoEm: resumo.criadoEm,
  },
  itens: [
    {
      produtoId: "44444444-4444-4444-8444-444444444444",
      nome: "Vaso",
      quantidade: 2,
      precoUnitario: 13.37,
      subtotal: 26.74,
    },
  ],
  pagamento: resumo.pagamento,
};
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

it("lista pedidos paginados por HTTP com status de pedido e pagamento", async () => {
  vi.mocked(fetch).mockResolvedValue(
    Response.json({ itens: [resumo], pagina: 2, limite: 2, total: 3 }),
  );
  const result = await new HttpPedidosService().listarMeus({
    pagina: 2,
    limite: 2,
  });
  expect(fetch).toHaveBeenCalledWith(
    "/api/pedidos?pagina=2&limite=2",
    expect.objectContaining({ credentials: "include", cache: "no-store" }),
  );
  expect(result).toEqual({
    itens: [
      {
        id,
        numeroConfirmacao: "ORG-2026-000001",
        status: "cancelado",
        total: 26.74,
        criadoEm: "2026-10-14T12:00:00.000Z",
        pagamento: resumo.pagamento,
      },
    ],
    pagina: 2,
    limite: 2,
    total: 3,
  });
});

it("obtem valores persistidos e pagamento do detalhe", async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json(detalhe));
  const result = await new HttpPedidosService().obter(id);
  expect(fetch).toHaveBeenCalledWith(
    `/api/pedidos/${id}`,
    expect.objectContaining({ method: "GET" }),
  );
  expect(result.itens).toEqual(detalhe.itens);
  expect(result.pagamento).toEqual(resumo.pagamento);
  expect(result.status).toBe("cancelado");
  expect(result.total).toBe(26.74);
});

it("propaga 404 sem fallback para o storage local", async () => {
  const storage = vi.spyOn(Storage.prototype, "getItem");
  vi.mocked(fetch).mockResolvedValue(
    Response.json(
      {
        error: {
          code: "PEDIDO_NAO_ENCONTRADO",
          message: "Pedido nao encontrado.",
        },
      },
      { status: 404 },
    ),
  );
  await expect(new HttpPedidosService().obter(id)).rejects.toMatchObject({
    code: "PEDIDO_NAO_ENCONTRADO",
  });
  expect(storage).not.toHaveBeenCalled();
  storage.mockRestore();
});

it.each([
  { pagina: 0 },
  { pagina: 1.5 },
  { limite: 101 },
  { limite: 0 },
  { pagina: 10001 },
])("valida paginacao antes do fetch: %j", async (paginacao) => {
  await expect(
    new HttpPedidosService().listarMeus(paginacao),
  ).rejects.toMatchObject({ code: "ENTRADA_INVALIDA" });
  expect(fetch).not.toHaveBeenCalled();
});

it.each(["", "../auth/me", "nao-uuid"])(
  "valida id antes do fetch: %s",
  async (value) => {
    await expect(new HttpPedidosService().obter(value)).rejects.toMatchObject({
      code: "ENTRADA_INVALIDA",
    });
    expect(fetch).not.toHaveBeenCalled();
  },
);

it.each([
  { ...detalhe, pagamento: { ...resumo.pagamento, status: "inventado" } },
  { ...detalhe, pagamento: { ...resumo.pagamento, valor: 20 } },
  { ...detalhe, pedido: { ...detalhe.pedido, status: "inventado" } },
  { ...detalhe, pedido: { ...detalhe.pedido, total: 90 } },
  { ...detalhe, itens: [{ ...detalhe.itens[0], subtotal: 20 }] },
])("rejeita resposta de detalhe inconsistente: %#", async (response) => {
  vi.mocked(fetch).mockResolvedValue(Response.json(response));
  await expect(new HttpPedidosService().obter(id)).rejects.toMatchObject({
    code: "RESPOSTA_INVALIDA",
  });
});

it("aceita legado sem valores ou pagamento, sem inventar comprovante", async () => {
  vi.mocked(fetch).mockResolvedValue(
    Response.json({
      pedido: {
        ...detalhe.pedido,
        numero: null,
        total: null,
        status: "pendente",
      },
      itens: [{ ...detalhe.itens[0], precoUnitario: null, subtotal: null }],
      pagamento: null,
    }),
  );
  const result = await new HttpPedidosService().obter(id);
  expect(result.total).toBeNull();
  expect(result.pagamento).toBeNull();
});

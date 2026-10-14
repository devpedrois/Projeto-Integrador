import { afterEach, expect, it, vi } from "vitest";
import { ApiClient } from "@/services/http/api-client";
const id = "b04aec23-d737-4a5b-aac1-edabf3aa0947";
const carrinho = {
  itens: [
    {
      produtoId: id,
      nome: "Vaso",
      precoUnitario: 10,
      quantidade: 2,
      estoqueDisponivel: 5,
    },
  ],
  total: 20,
  atualizadoEm: "2026-10-14T00:00:00.000Z",
};
afterEach(() => vi.unstubAllGlobals());
it("409 preserva somente produto e nome permitidos", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json(
        {
          error: {
            code: "ESTOQUE_INSUFICIENTE",
            message: "detalhe-interno",
            details: { produtoId: id, nome: "Vaso", senha: "nao-expor" },
          },
        },
        { status: 409 },
      ),
    ),
  );
  const error = await new ApiClient()
    .request("/carrinho")
    .catch((e: unknown) => e);
  expect(error).toMatchObject({
    code: "ESTOQUE_INSUFICIENTE",
    message: expect.stringContaining("Vaso"),
    details: { produtoId: id, nome: "Vaso" },
  });
  expect(JSON.stringify(error)).not.toContain("nao-expor");
  expect(JSON.stringify(error)).not.toContain("detalhe-interno");
});
it("adapter valida DTO e chama somente rotas do token", async () => {
  const { HttpCarrinhoService } =
    await import("@/services/http/carrinho.service");
  const fetchMock = vi
    .fn()
    .mockImplementation(async () => Response.json(carrinho));
  vi.stubGlobal("fetch", fetchMock);
  const service = new HttpCarrinhoService();
  expect(await service.obter()).toEqual(carrinho);
  await service.adicionar(id, 2);
  await service.alterarQuantidade(id, 1);
  await service.remover(id);
  expect(
    fetchMock.mock.calls.map(([path, options]) => [path, options.method]),
  ).toEqual([
    ["/api/carrinho", "GET"],
    ["/api/carrinho/itens", "POST"],
    [`/api/carrinho/itens/${id}`, "PATCH"],
    [`/api/carrinho/itens/${id}`, "DELETE"],
  ]);
});
it.each([
  { total: "20" },
  { itens: [{ ...carrinho.itens[0], precoUnitario: -1 }] },
  { itens: [{ ...carrinho.itens[0], quantidade: 0 }] },
])("rejeita DTO invalido %j", async (extra) => {
  const { HttpCarrinhoService } =
    await import("@/services/http/carrinho.service");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ ...carrinho, ...extra })),
  );
  await expect(new HttpCarrinhoService().obter()).rejects.toMatchObject({
    code: "RESPOSTA_INVALIDA",
  });
});

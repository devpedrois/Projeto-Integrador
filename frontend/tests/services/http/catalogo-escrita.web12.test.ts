import { afterEach, expect, it, vi } from "vitest";
import { HttpProdutosService } from "@/services/http/produtos.service";
import { HttpUsuariosService } from "@/services/http/usuarios.service";
import { obterModeracaoService } from "@/services/fake/container";

const produto = {
  id: "p1",
  nome: "Vaso",
  descricao: "Barro",
  preco: 25,
  categoriaId: "c1",
  tecnicaId: "t1",
  regiaoId: "r1",
  artesaoId: "a1",
  fotos: [{ url: "https://example.test/foto.jpg", ordem: 0 }],
  quantidadeEstoque: 0,
  quantidadeVendida: 0,
  notaMedia: 0,
  ativo: false,
  desativadoPorAdmin: false,
  criadoEm: "2026-10-14T00:00:00Z",
};
const input = {
  nome: "Vaso",
  descricao: "Barro",
  preco: 25,
  categoriaId: "c1",
  fotos: [{ url: "https://example.test/foto.jpg" }],
  quantidadeEstoque: 0,
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("escreve produtos com cookie sem enviar identidade do artesao", async () => {
  const fetchMock = vi
    .fn()
    .mockImplementation(async () => Response.json(produto));
  vi.stubGlobal("fetch", fetchMock);
  const service = new HttpProdutosService();
  expect(await service.create(input, "a1")).toEqual(produto);
  expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/produtos");
  expect(JSON.parse(fetchMock.mock.calls[0]?.[1].body)).toEqual(input);
  expect(await service.update("p1", input, "a1")).toEqual(produto);
  expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/produtos/p1");
  expect(fetchMock.mock.calls[1]?.[1].method).toBe("PATCH");
  await service.remove("p1", "a1");
  expect(fetchMock.mock.calls[2]?.[1].method).toBe("DELETE");
  expect(
    fetchMock.mock.calls.every((call) => call[1].credentials === "include"),
  ).toBe(true);
});
it("lista catalogo privado sem filtros publicos", async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json([produto]));
  vi.stubGlobal("fetch", fetchMock);
  expect(await new HttpProdutosService().listByArtesao("a1")).toEqual([
    produto,
  ]);
  expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/artesao/produtos");
});
it("atualiza estoque pelo endpoint dedicado", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(Response.json({ ...produto, quantidadeEstoque: 8 }));
  vi.stubGlobal("fetch", fetchMock);
  expect(
    await new HttpProdutosService().atualizarEstoque("p1", 8),
  ).toMatchObject({ quantidadeEstoque: 8 });
  expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/produtos/p1/estoque");
  expect(JSON.parse(fetchMock.mock.calls[0]?.[1].body)).toEqual({
    quantidadeEstoque: 8,
  });
  await expect(
    new HttpProdutosService().atualizarEstoque("p1", -1),
  ).rejects.toMatchObject({ code: "ENTRADA_INVALIDA" });
});
it("moderacao HTTP usa todas as rotas administrativas sem adminId externo", async () => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http");
  const usuario = {
    id: "a1",
    nome: "Ana",
    email: "ana@example.test",
    papel: "artesao",
    ativo: false,
  };
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(Response.json([usuario]))
    .mockResolvedValueOnce(Response.json([produto]))
    .mockResolvedValueOnce(Response.json(usuario))
    .mockResolvedValueOnce(Response.json(usuario))
    .mockResolvedValueOnce(Response.json(produto))
    .mockResolvedValueOnce(Response.json(produto));
  vi.stubGlobal("fetch", fetchMock);
  const service = obterModeracaoService();
  expect(await service.listarArtesaos("admin")).toEqual([usuario]);
  expect(await service.listarProdutos("admin")).toEqual([produto]);
  expect(await service.desativarArtesao("a1", "admin")).toEqual(usuario);
  expect(await service.ativarArtesao("a1", "admin")).toEqual(usuario);
  expect(await service.desativarProduto("p1", "admin")).toEqual(produto);
  expect(await service.ativarProduto("p1", "admin")).toEqual(produto);
  expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
    "/api/admin/artesaos",
    "/api/admin/produtos",
    "/api/admin/artesaos/a1/moderar",
    "/api/admin/artesaos/a1/moderar",
    "/api/admin/produtos/p1/moderar",
    "/api/admin/produtos/p1/moderar",
  ]);
  expect(
    fetchMock.mock.calls.slice(2).map((call) => JSON.parse(call[1].body)),
  ).toEqual([
    { ativo: false },
    { ativo: true },
    { ativo: false },
    { ativo: true },
  ]);
});
it("UsuariosService.list usa lista administrativa com resposta validada", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json([
        {
          id: "a1",
          nome: "Ana",
          email: "ana@example.test",
          papel: "artesao",
          ativo: true,
          senhaHash: "nunca-retornar",
        },
      ]),
    ),
  );
  expect(await new HttpUsuariosService().list()).toEqual([
    {
      id: "a1",
      nome: "Ana",
      email: "ana@example.test",
      papel: "artesao",
      ativo: true,
    },
  ]);
});

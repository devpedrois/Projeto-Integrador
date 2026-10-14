import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CartStore } from "@/store/carrinho.store";
import { BrowserCarrinhoStorage } from "@/fake-api/storage/carrinho.storage";
import type { Carrinho } from "@/types/carrinho";
import type { Produto } from "@/types/produto";

const id = "b04aec23-d737-4a5b-aac1-edabf3aa0947";
const produto: Produto = {
  id,
  nome: "Vaso HTTP",
  preco: 20,
  descricao: "Sintetico",
  categoriaId: "c",
  tecnicaId: "t",
  regiaoId: "r",
  artesaoId: "a",
  fotos: [],
  quantidadeEstoque: 5,
  quantidadeVendida: 0,
  notaMedia: 0,
  ativo: true,
  criadoEm: "2026-10-14T00:00:00Z",
};
let servidor: Carrinho;
let offline: boolean;
let oculto: boolean;
let estoque: number;
const requests: {
  metodo: string;
  path: string;
  body?: Record<string, unknown>;
}[] = [];
beforeEach(() => {
  window.localStorage.clear();
  offline = false;
  oculto = false;
  estoque = 5;
  requests.length = 0;
  servidor = { itens: [], total: 0, atualizadoEm: "2026-10-14T00:00:00.000Z" };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string, options: RequestInit) => {
      if (offline) throw new Error("Offline");
      const metodo = options.method ?? "GET";
      const body = options.body
        ? (JSON.parse(String(options.body)) as Record<string, unknown>)
        : undefined;
      requests.push({ metodo, path, ...(body ? { body } : {}) });
      if (path.startsWith("/api/produtos/"))
        return oculto || path !== `/api/produtos/${id}`
          ? Response.json({}, { status: 404 })
          : Response.json({ ...produto, quantidadeEstoque: estoque });
      if (metodo !== "GET") {
        const quantidade =
          Number(body?.quantidade ?? 0) +
          (metodo === "POST" ? (servidor.itens[0]?.quantidade ?? 0) : 0);
        if (quantidade > estoque)
          return Response.json(
            {
              error: {
                code: "ESTOQUE_INSUFICIENTE",
                details: { produtoId: id, nome: "Vaso HTTP" },
              },
            },
            { status: 409 },
          );
        servidor = {
          ...servidor,
          itens:
            metodo === "DELETE"
              ? []
              : [
                  {
                    produtoId: id,
                    nome: "Vaso HTTP",
                    precoUnitario: 20,
                    quantidade,
                    estoqueDisponivel: estoque,
                  },
                ],
          total: metodo === "DELETE" ? 0 : quantidade * 20,
        };
      }
      return Response.json(servidor);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());
it("descarta ID legado da fake API rejeitado pelo backend com aviso", async () => {
  const local = visitante();
  local.adicionar(
    { ...produto, id: "seed-invalido", nome: "Produto antigo" },
    1,
  );
  const transporte = vi.mocked(fetch).getMockImplementation();
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string, options: RequestInit) => {
      if (path === "/api/produtos/seed-invalido")
        return Promise.resolve(
          Response.json({ error: { code: "VALIDACAO" } }, { status: 400 }),
        );
      if (!transporte) throw new Error("Transporte ausente");
      return transporte(path, options);
    }),
  );
  const remoto = await store();
  await remoto.hidratar(local);
  expect(local.getSnapshot().itens).toEqual([]);
  expect(remoto.getEstadoSnapshot().avisos.join(" ")).toContain(
    "Produto antigo",
  );
  expect(requests.filter((r) => r.metodo === "POST")).toHaveLength(0);
});
it("mesclagem parcial retoma sem duplicar o item ja confirmado", async () => {
  const outroId = "9bf70ec9-4cf9-4a45-972d-032f51fbad8b";
  const local = visitante();
  local.adicionar(produto, 2);
  local.adicionar({ ...produto, id: outroId, nome: "Outro produto" }, 1);
  const transporte = vi.mocked(fetch).getMockImplementation();
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string, options: RequestInit) => {
      if (path.endsWith(`/produtos/${outroId}`))
        return Promise.reject(new Error("Offline parcial"));
      if (!transporte) throw new Error("Transporte ausente");
      return transporte(path, options);
    }),
  );
  const remoto = await store();
  await expect(remoto.hidratar(local)).rejects.toMatchObject({
    code: "ERRO_REDE",
  });
  expect(local.getSnapshot().itens.map((item) => item.produtoId)).toEqual([
    outroId,
  ]);
  expect(servidor.itens[0]?.quantidade).toBe(2);
  vi.stubGlobal("fetch", transporte);
  await remoto.recarregar();
  expect(remoto.getSnapshot().itens[0]?.quantidade).toBe(2);
  expect(requests.filter((r) => r.metodo === "POST")).toHaveLength(1);
  expect(local.getSnapshot().itens).toEqual([]);
});
async function store(ativa = () => true) {
  const { HttpCarrinhoService } =
    await import("@/services/http/carrinho.service");
  const { HttpProdutosService } =
    await import("@/services/http/produtos.service");
  return new CartStore(
    null,
    new HttpCarrinhoService(),
    new HttpProdutosService(),
    ativa,
  );
}
function visitante() {
  return new CartStore(
    new BrowserCarrinhoStorage(window.localStorage, "visitante"),
  );
}

it("hidrata e persiste no servidor sem cache local do comprador", async () => {
  const carrinho = await store();
  await carrinho.hidratar();
  await carrinho.adicionar({ ...produto, preco: 0.01 }, 2);
  expect(carrinho.getSnapshot()).toMatchObject({
    total: 40,
    itens: [{ precoUnitario: 20, quantidade: 2 }],
  });
  expect(requests.find((r) => r.metodo === "POST")?.body).toEqual({
    produtoId: id,
    quantidade: 2,
  });
  expect(window.localStorage.length).toBe(0);
  carrinho.desconectar();
  const novo = await store();
  await novo.hidratar();
  expect(novo.getSnapshot().itens[0]?.quantidade).toBe(2);
});
it("mescla uma vez somando ate o estoque e limpa visitante", async () => {
  servidor.itens = [
    {
      produtoId: id,
      nome: produto.nome,
      precoUnitario: 20,
      quantidade: 3,
      estoqueDisponivel: 5,
    },
  ];
  const local = visitante();
  local.adicionar(produto, 4);
  const remoto = await store();
  await Promise.all([remoto.hidratar(local), remoto.hidratar(local)]);
  expect(remoto.getSnapshot().itens[0]?.quantidade).toBe(5);
  expect(remoto.getEstadoSnapshot().avisos.join(" ")).toMatch(/Vaso HTTP/);
  expect(local.getSnapshot().itens).toEqual([]);
  expect(
    window.localStorage.getItem("origem:v1:carrinho:visitante"),
  ).toBeNull();
  expect(requests.filter((r) => r.metodo === "POST")).toHaveLength(1);
});
it("descarta produto oculto com aviso e preserva carrinho remoto", async () => {
  const local = visitante();
  local.adicionar(produto, 2);
  oculto = true;
  const remoto = await store();
  await remoto.hidratar(local);
  expect(remoto.getSnapshot().itens).toEqual([]);
  expect(local.getSnapshot().itens).toEqual([]);
  expect(remoto.getEstadoSnapshot().avisos.join(" ")).toMatch(/Vaso HTTP/);
});
it("estoque reduzido limita tambem a quantidade existente no servidor", async () => {
  servidor.itens = [
    {
      produtoId: id,
      nome: produto.nome,
      precoUnitario: 20,
      quantidade: 5,
      estoqueDisponivel: 3,
    },
  ];
  servidor.total = 100;
  estoque = 3;
  const local = visitante();
  local.adicionar(produto, 2);
  const remoto = await store();
  await remoto.hidratar(local);
  expect(remoto.getSnapshot().itens[0]?.quantidade).toBe(3);
  expect(local.getSnapshot().itens).toEqual([]);
  expect(remoto.getEstadoSnapshot().avisos.join(" ")).toMatch(/Vaso HTTP/);
});
it("falha de rede preserva local e permite recarregar", async () => {
  const local = visitante();
  local.adicionar(produto, 2);
  offline = true;
  const remoto = await store();
  await expect(remoto.hidratar(local)).rejects.toMatchObject({
    code: "ERRO_REDE",
  });
  expect(local.getSnapshot().itens[0]?.quantidade).toBe(2);
  expect(remoto.getEstadoSnapshot().erro).toBeTruthy();
  offline = false;
  await remoto.recarregar();
  expect(remoto.getSnapshot().itens[0]?.quantidade).toBe(2);
  expect(local.getSnapshot().itens).toEqual([]);
});
it("usa estoque atual do servidor e exibe nome no 409", async () => {
  const remoto = await store();
  await remoto.hidratar();
  await remoto.adicionar(produto, 2);
  estoque = 2;
  await expect(remoto.alterarQuantidade(id, 3)).rejects.toMatchObject({
    code: "ESTOQUE_INSUFICIENTE",
    details: { produtoId: id, nome: "Vaso HTTP" },
  });
  expect(remoto.getSnapshot().itens[0]?.quantidade).toBe(2);
  expect(remoto.getEstadoSnapshot().erro).toContain("Vaso HTTP");
});
it("serializa mutacoes e quantidade zero remove pelo DELETE", async () => {
  const remoto = await store();
  await remoto.hidratar();
  await Promise.all([
    remoto.adicionar(produto, 1),
    remoto.adicionar(produto, 1),
  ]);
  expect(remoto.getSnapshot().itens[0]?.quantidade).toBe(2);
  await remoto.alterarQuantidade(id, 0);
  expect(remoto.getSnapshot().itens).toEqual([]);
  expect(requests.at(-1)?.metodo).toBe("DELETE");
});
it("logout invalida resposta atrasada e bloqueia chamadas seguintes", async () => {
  let ativa = true;
  let resolver!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolver = resolve;
        }),
    ),
  );
  const remoto = await store(() => ativa);
  const leitura = remoto.hidratar();
  ativa = false;
  remoto.desconectar();
  resolver(
    Response.json({
      ...servidor,
      itens: [
        {
          produtoId: id,
          nome: produto.nome,
          precoUnitario: 20,
          quantidade: 1,
          estoqueDisponivel: 5,
        },
      ],
    }),
  );
  await leitura.catch(() => {});
  expect(remoto.getSnapshot().itens).toEqual([]);
  await expect(remoto.adicionar(produto, 1)).rejects.toMatchObject({
    code: "NAO_AUTENTICADO",
  });
});

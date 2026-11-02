import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBuscaProdutos } from "@/hooks/use-busca-produtos";
import { useRecomendacoes } from "@/hooks/use-recomendacoes";
import { useArtesaosAtivos } from "@/hooks/use-artesaos-ativos";
import { HttpProdutosService } from "@/services/http/produtos.service";
import { HttpRecommendationAdapter } from "@/services/http/recomendacoes.adapter";
import { HttpUsuariosService } from "@/services/http/usuarios.service";
import type { Produto } from "@/types/produto";

const produto: Produto = {
  id: "produto-1",
  nome: "Vaso anterior",
  descricao: "Sintetico",
  preco: 20,
  categoriaId: "categoria-1",
  tecnicaId: "tecnica-1",
  regiaoId: "regiao-1",
  artesaoId: "artesao-1",
  fotos: [],
  quantidadeEstoque: 3,
  quantidadeVendida: 0,
  notaMedia: 0,
  ativo: true,
  criadoEm: "2026-11-02T00:00:00Z",
};
const produtosService = new HttpProdutosService();
const recomendacoesService = new HttpRecommendationAdapter();
const usuariosService = new HttpUsuariosService();
let produtos: Produto[];
let falhar: boolean;
let urls: string[];

beforeEach(() => {
  vi.useFakeTimers();
  produtos = [{ ...produto }];
  falhar = false;
  urls = [];
  vi.stubGlobal("fetch", async (input: string) => {
    urls.push(input);
    if (falhar) return Response.json({}, { status: 503 });
    const url = new URL(input, "https://origem.test");
    if (url.pathname === "/api/artesaos") {
      return Response.json(
        produtos.map((p) => ({
          id: p.artesaoId,
          nome: p.nome,
          papel: "artesao",
          ativo: true,
        })),
      );
    }
    if (url.pathname.startsWith("/api/recomendacoes")) {
      return Response.json({ estrategia: "categoria", itens: produtos });
    }
    const termo = url.searchParams.get("termo");
    return Response.json(
      produtos.filter((p) => !termo || p.nome.includes(termo)),
    );
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function useVitrine() {
  return {
    busca: useBuscaProdutos(produtosService, {
      termo: "Vaso",
      artesaoId: "artesao-1",
    }),
    recomendacoes: useRecomendacoes(recomendacoesService, {}),
    artesaos: useArtesaosAtivos(usuariosService),
  };
}

describe("Atualizacao da vitrine com os adapters HTTP", () => {
  it("renova busca filtrada recomendacoes e artesaos sem remontar", async () => {
    const { result } = renderHook(useVitrine);
    await act(async () => {});
    expect(result.current.artesaos.status).toBe("sucesso");
    produtos = [
      {
        ...produto,
        id: "produto-2",
        nome: "Vaso novo",
        preco: 35,
        quantidadeEstoque: 1,
      },
    ];
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(result.current.busca).toMatchObject({
      status: "sucesso",
      produtos: [{ id: "produto-2", preco: 35, quantidadeEstoque: 1 }],
    });
    expect(result.current.recomendacoes).toMatchObject({
      status: "sucesso",
      resultado: { itens: [{ id: "produto-2" }] },
    });
    expect(result.current.artesaos).toMatchObject({
      status: "sucesso",
      artesaos: [{ nome: "Vaso novo" }],
    });
    expect(
      urls.filter((u) => u === "/api/produtos?termo=Vaso&artesaoId=artesao-1"),
    ).toHaveLength(2);
  });

  it.each(["focus", "online"])(
    "renova ao receber %s e remove produtos indisponiveis",
    async (evento) => {
      const { result } = renderHook(useVitrine);
      await act(async () => {});
      expect(result.current.busca.status).toBe("sucesso");
      produtos = [];
      await act(async () => {
        window.dispatchEvent(new Event(evento));
      });
      expect(result.current.busca.status).toBe("vazio");
      expect(result.current.recomendacoes.status).toBe("vazio");
      expect(result.current.artesaos).toMatchObject({
        status: "sucesso",
        artesaos: [],
      });
    },
  );

  it("suspende consultas oculta e atualiza imediatamente ao retornar", async () => {
    const { result } = renderHook(useVitrine);
    await act(async () => {});
    expect(result.current.busca.status).toBe("sucesso");
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    const antes = urls.length;
    produtos = [];
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(urls).toHaveLength(antes);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current.busca.status).toBe("vazio");
  });

  it("recupera uma falha de atualizacao na proxima consulta", async () => {
    const { result } = renderHook(useVitrine);
    await act(async () => {});
    expect(result.current.busca.status).toBe("sucesso");
    falhar = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(result.current.busca.status).toBe("erro");
    falhar = false;
    produtos = [];
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(result.current.busca.status).toBe("vazio");
  });

  it("nao sobrepoe consultas nem pisca o carregamento durante a renovacao", async () => {
    const { result } = renderHook(() => useBuscaProdutos(produtosService, {}));
    await act(async () => {});
    expect(result.current.status).toBe("sucesso");
    let concluir!: (response: Response) => void;
    const transporte = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          concluir = resolve;
        }),
    );
    vi.stubGlobal("fetch", transporte);
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(result.current.status).toBe("sucesso");
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(transporte).toHaveBeenCalledTimes(1);
    await act(async () => {
      concluir(Response.json([]));
    });
    expect(result.current.status).toBe("vazio");
  });

  it("descarta respostas de filtros anteriores e cancela as assinaturas ao sair", async () => {
    let concluirAntiga!: (response: Response) => void;
    const destinoAntigo = new Promise<Response>((resolve) => {
      concluirAntiga = resolve;
    });
    vi.stubGlobal("fetch", (url: string) =>
      url.includes("termo=antigo")
        ? destinoAntigo
        : Promise.resolve(Response.json([])),
    );
    const { result, rerender, unmount } = renderHook(
      ({ termo }) => useBuscaProdutos(produtosService, { termo }),
      { initialProps: { termo: "antigo" } },
    );
    rerender({ termo: "novo" });
    await act(async () => {});
    expect(result.current.status).toBe("vazio");
    await act(async () => {
      concluirAntiga(Response.json([produto]));
    });
    expect(result.current.status).toBe("vazio");
    vi.useFakeTimers();
    unmount();
    const transporte = vi.fn();
    vi.stubGlobal("fetch", transporte);
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("online"));
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(transporte).not.toHaveBeenCalled();
  });
});

import { afterEach, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useNomeArtesao } from "@/hooks/use-nome-artesao";
import { usePerfilPublicoArtesao } from "@/hooks/use-perfil-publico-artesao";
import { HttpUsuariosService } from "@/services/http/usuarios.service";
import { HttpProdutosService } from "@/services/http/produtos.service";
import { HttpOpcoesFiltroService } from "@/services/http/opcoes-filtro.service";

const dto = {
  artesaoId: "bdc970c1-2b87-467e-80f3-d5d7100780a7",
  nome: "Ana sintetica",
  historia: "Ceramica",
  tecnicaId: "tecnica-modelagem-argila",
  regiaoId: "regiao-alto-moura-caruaru",
  completo: true,
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("nome do artesao usa endpoint publico com adapter real", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(dto)));
  const usuarios = new HttpUsuariosService();
  const { result } = renderHook(() => useNomeArtesao(usuarios, dto.artesaoId));
  await waitFor(() => expect(result.current).toBe("Ana sintetica"));
});
it("perfil publico HTTP mostra nome e estado vazio sem listar usuarios", async () => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      Response.json(url.includes("perfil-artesao") ? dto : []),
    ),
  );
  const { obterPerfilArtesaoService } =
    await import("@/services/fake/container");
  const perfil = obterPerfilArtesaoService();
  const usuarios = new HttpUsuariosService();
  const produtos = new HttpProdutosService();
  const opcoes = new HttpOpcoesFiltroService();
  const { result } = renderHook(() =>
    usePerfilPublicoArtesao(usuarios, perfil, produtos, opcoes, dto.artesaoId),
  );
  await waitFor(() => expect(result.current.estado.status).toBe("sucesso"));
  expect(result.current.estado).toMatchObject({
    usuario: { id: dto.artesaoId, nome: "Ana sintetica" },
    produtos: [],
  });
});
it("perfil HTTP inexistente mostra nao encontrado", async () => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.includes("perfil-artesao")
        ? Response.json({}, { status: 404 })
        : Response.json([]),
    ),
  );
  const { obterPerfilArtesaoService } =
    await import("@/services/fake/container");
  const perfil = obterPerfilArtesaoService();
  const usuarios = new HttpUsuariosService();
  const produtos = new HttpProdutosService();
  const opcoes = new HttpOpcoesFiltroService();
  const { result } = renderHook(() =>
    usePerfilPublicoArtesao(usuarios, perfil, produtos, opcoes, dto.artesaoId),
  );
  await waitFor(() =>
    expect(result.current.estado.status).toBe("naoEncontrado"),
  );
});

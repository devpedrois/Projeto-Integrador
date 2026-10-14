import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpUsuariosService } from "@/services/http/usuarios.service";
import { HttpProdutosService } from "@/services/http/produtos.service";

const dto = {
  artesaoId: "bdc970c1-2b87-467e-80f3-d5d7100780a7",
  nome: "Ana sintetica",
  historia: "Ceramica",
  tecnicaId: "tecnica-modelagem-argila",
  regiaoId: "regiao-alto-moura-caruaru",
  completo: true,
};
async function service() {
  const container = await import("@/services/fake/container");
  return container.obterPerfilArtesaoService();
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("WEB-07 adapters HTTP", () => {
  it("perfil sai de pendentes e carrega sem acessar storage", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http");
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("Fake proibida");
    });
    const fetchMock = vi.fn().mockResolvedValue(Response.json(dto));
    vi.stubGlobal("fetch", fetchMock);
    const container = await import("@/services/fake/container");
    expect(container.PENDENTES_HTTP).not.toContain("PerfilArtesaoService");
    expect(await (await service()).obter(dto.artesaoId)).toEqual(dto);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `/api/usuarios/${dto.artesaoId}/perfil-artesao`,
    );
  });
  it("salva pela rota PATCH com cookie e campos permitidos", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http");
    const fetchMock = vi.fn().mockResolvedValue(Response.json(dto));
    vi.stubGlobal("fetch", fetchMock);
    const input = {
      historia: "  Ceramica  ",
      tecnicaId: dto.tecnicaId,
      regiaoId: dto.regiaoId,
      fotoUrl: "",
    };
    expect(await (await service()).salvar(input, dto.artesaoId)).toEqual(dto);
    const options = fetchMock.mock.calls[0]?.[1];
    expect(options).toMatchObject({ method: "PATCH", credentials: "include" });
    expect(JSON.parse(options.body)).toEqual({
      ...input,
      historia: "Ceramica",
    });
  });
  it("resolve o nome pela API publica sem listar usuarios", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(dto));
    vi.stubGlobal("fetch", fetchMock);
    const usuarios = new HttpUsuariosService();
    expect(await usuarios.obterNomeArtesao(dto.artesaoId)).toBe(
      "Ana sintetica",
    );
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `/api/usuarios/${dto.artesaoId}/perfil-artesao`,
    );
  });
  it("lista produtos publicos do artesao pelo filtro existente", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json([]));
    vi.stubGlobal("fetch", fetchMock);
    expect(
      await new HttpProdutosService().listByArtesao(dto.artesaoId),
    ).toEqual([]);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `/api/produtos?artesaoId=${dto.artesaoId}`,
    );
  });
  it("404 vira null e 403 e 503 continuam erros recuperaveis", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({}, { status: 404 }))
        .mockResolvedValueOnce(Response.json({}, { status: 403 }))
        .mockResolvedValueOnce(Response.json({}, { status: 503 })),
    );
    const perfil = await service();
    expect(await perfil.obter(dto.artesaoId)).toBeNull();
    await expect(perfil.salvar(dto, dto.artesaoId)).rejects.toMatchObject({
      code: "ACESSO_NEGADO",
    });
    await expect(perfil.obter(dto.artesaoId)).rejects.toMatchObject({
      code: "SERVICO_INDISPONIVEL",
    });
  });
  it.each([
    { nome: 123 },
    { completo: "sim" },
    { historia: null },
    { fotoUrl: "javascript:alert(1)" },
  ])("rejeita resposta malformada %j", async (extra) => {
    vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ ...dto, ...extra })),
    );
    await expect((await service()).obter(dto.artesaoId)).rejects.toMatchObject({
      code: "RESPOSTA_INVALIDA",
    });
  });
});

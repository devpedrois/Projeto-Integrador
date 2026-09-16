import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useOpcoesFiltro } from "@/hooks/use-opcoes-filtro";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";

function criarServicoFake(
  overrides: Partial<OpcoesFiltroService> = {}
): OpcoesFiltroService {
  return {
    categorias: vi.fn().mockResolvedValue([]),
    tecnicas: vi.fn().mockResolvedValue([]),
    regioes: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("useOpcoesFiltro", () => {
  it("inicia em carregando quando o service esta disponivel", () => {
    const service = criarServicoFake({
      categorias: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    const { result } = renderHook(() => useOpcoesFiltro(service));

    expect(result.current.status).toBe("carregando");
  });

  it("carrega categorias, tecnicas e regioes em paralelo", async () => {
    const service = criarServicoFake({
      categorias: vi.fn().mockResolvedValue([{ id: "cat-1", nome: "Ceramica" }]),
      tecnicas: vi.fn().mockResolvedValue([{ id: "tec-1", nome: "Torno" }]),
      regioes: vi.fn().mockResolvedValue([{ id: "reg-1", nome: "Pilar" }]),
    });

    const { result } = renderHook(() => useOpcoesFiltro(service));

    await waitFor(() => expect(result.current.status).toBe("sucesso"));
    if (result.current.status !== "sucesso") throw new Error("inesperado");
    expect(result.current.categorias).toEqual([{ id: "cat-1", nome: "Ceramica" }]);
    expect(result.current.tecnicas).toEqual([{ id: "tec-1", nome: "Torno" }]);
    expect(result.current.regioes).toEqual([{ id: "reg-1", nome: "Pilar" }]);
  });

  it("retorna erro quando alguma lista falha", async () => {
    const service = criarServicoFake({
      tecnicas: vi.fn().mockRejectedValue(new Error("falhou")),
    });

    const { result } = renderHook(() => useOpcoesFiltro(service));

    await waitFor(() => expect(result.current.status).toBe("erro"));
  });

  it("mantem carregando quando o service ainda nao esta pronto", () => {
    const { result } = renderHook(() => useOpcoesFiltro(null));

    expect(result.current.status).toBe("carregando");
  });
});

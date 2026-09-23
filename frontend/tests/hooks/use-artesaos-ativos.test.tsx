import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useArtesaosAtivos } from "@/hooks/use-artesaos-ativos";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { UsuarioPublico } from "@/types/usuario";

function usuario(overrides: Partial<UsuarioPublico> = {}): UsuarioPublico {
  return {
    id: "artesao-1",
    nome: "Maria das Rendas",
    email: "maria@origem.test",
    papel: "artesao",
    ativo: true,
    ...overrides,
  };
}

function criarServicoFake(usuarios: UsuarioPublico[]): UsuariosService {
  return {
    list: vi.fn().mockResolvedValue(usuarios),
    register: vi.fn(),
    login: vi.fn(),
  };
}

describe("useArtesaosAtivos", () => {
  it("comeca carregando quando o service ainda nao resolveu", () => {
    const service = criarServicoFake([]);
    const { result } = renderHook(() => useArtesaosAtivos(service));

    expect(result.current.status).toBe("carregando");
  });

  it("permanece carregando quando o service e null", () => {
    const { result } = renderHook(() => useArtesaosAtivos(null));

    expect(result.current.status).toBe("carregando");
  });

  it("retorna somente usuarios com papel artesao e ativos, ordenados por nome", async () => {
    const service = criarServicoFake([
      usuario({ id: "artesao-2", nome: "Zeca do Barro", papel: "artesao", ativo: true }),
      usuario({ id: "comprador-1", nome: "Ana Compradora", papel: "comprador", ativo: true }),
      usuario({ id: "artesao-3", nome: "Joana Inativa", papel: "artesao", ativo: false }),
      usuario({ id: "artesao-1", nome: "Beto Ceramista", papel: "artesao", ativo: true }),
    ]);

    const { result } = renderHook(() => useArtesaosAtivos(service));

    await waitFor(() => expect(result.current.status).toBe("sucesso"));
    expect(result.current).toMatchObject({
      status: "sucesso",
      artesaos: [
        { id: "artesao-1", nome: "Beto Ceramista" },
        { id: "artesao-2", nome: "Zeca do Barro" },
      ],
    });
  });

  it("retorna erro recuperavel quando o service falha", async () => {
    const service: UsuariosService = {
      list: vi.fn().mockRejectedValue(new Error("falhou")),
      register: vi.fn(),
      login: vi.fn(),
    };

    const { result } = renderHook(() => useArtesaosAtivos(service));

    await waitFor(() => expect(result.current.status).toBe("erro"));
  });
});

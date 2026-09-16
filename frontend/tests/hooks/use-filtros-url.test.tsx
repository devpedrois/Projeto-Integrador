import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFiltrosUrl } from "@/hooks/use-filtros-url";

const pushMock = vi.fn();
let searchParamsAtual = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/",
  useSearchParams: () => searchParamsAtual,
}));

beforeEach(() => {
  pushMock.mockClear();
  searchParamsAtual = new URLSearchParams();
});

describe("useFiltrosUrl", () => {
  it("inicializa a consulta a partir dos parametros presentes na URL", () => {
    searchParamsAtual = new URLSearchParams(
      "termo=vaso&categoria=categoria-ceramica-barro"
    );

    const { result } = renderHook(() => useFiltrosUrl());

    expect(result.current.query).toEqual({
      termo: "vaso",
      categoriaId: "categoria-ceramica-barro",
    });
  });

  it("inicializa com consulta vazia quando a URL nao possui filtros", () => {
    const { result } = renderHook(() => useFiltrosUrl());

    expect(result.current.query).toEqual({});
  });

  it("ignora parametros invalidos ou desconhecidos na inicializacao", () => {
    searchParamsAtual = new URLSearchParams("pagina=2&termo=&categoria=cat-1");

    const { result } = renderHook(() => useFiltrosUrl());

    expect(result.current.query).toEqual({ categoriaId: "cat-1" });
  });

  it("atualizar() envia ao router a URL com os filtros ativos combinados", () => {
    searchParamsAtual = new URLSearchParams("termo=vaso");

    const { result } = renderHook(() => useFiltrosUrl());
    result.current.atualizar({ categoriaId: "categoria-ceramica-barro" });

    expect(pushMock).toHaveBeenCalledWith(
      "/?termo=vaso&categoria=categoria-ceramica-barro",
      { scroll: false }
    );
  });

  it("atualizar() remove o parametro quando o novo valor e vazio", () => {
    searchParamsAtual = new URLSearchParams("termo=vaso&categoria=categoria-ceramica-barro");

    const { result } = renderHook(() => useFiltrosUrl());
    result.current.atualizar({ categoriaId: undefined });

    expect(pushMock).toHaveBeenCalledWith("/?termo=vaso", { scroll: false });
  });

  it("atualizar() navega para o caminho puro quando nenhum filtro permanece ativo", () => {
    searchParamsAtual = new URLSearchParams("termo=vaso");

    const { result } = renderHook(() => useFiltrosUrl());
    result.current.atualizar({ termo: undefined });

    expect(pushMock).toHaveBeenCalledWith("/", { scroll: false });
  });

  it("limpar() remove termo e todos os filtros da URL de uma vez", () => {
    searchParamsAtual = new URLSearchParams(
      "termo=vaso&categoria=categoria-ceramica-barro&tecnica=tecnica-torno-ceramico&regiao=regiao-pilar-recife"
    );

    const { result } = renderHook(() => useFiltrosUrl());
    result.current.limpar();

    expect(pushMock).toHaveBeenCalledWith("/", { scroll: false });
  });

  it("limpar() nao falha quando a URL ja esta sem filtros", () => {
    const { result } = renderHook(() => useFiltrosUrl());
    result.current.limpar();

    expect(pushMock).toHaveBeenCalledWith("/", { scroll: false });
  });
});

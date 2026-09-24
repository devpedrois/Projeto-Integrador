import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { usePerfilPublicoArtesao } from "@/hooks/use-perfil-publico-artesao";
import { CATEGORIA_IDS } from "@/fake-api/seeds/categorias.seed";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { PerfilArtesaoService } from "@/services/contracts/perfil-artesao.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";
import type { UsuarioPublico } from "@/types/usuario";
import type { PerfilArtesao } from "@/types/perfil-artesao";
import type { Produto } from "@/types/produto";

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

function perfil(overrides: Partial<PerfilArtesao> = {}): PerfilArtesao {
  return {
    artesaoId: "artesao-1",
    historia: "Aprendi a arte da renda com minha avo no Pilar.",
    tecnicaId: "tecnica-1",
    regiaoId: "regiao-1",
    ...overrides,
  };
}

function produto(overrides: Partial<Produto> = {}): Produto {
  return {
    id: "produto-1",
    nome: "Toalha de Renda",
    descricao: "Toalha feita a mao.",
    preco: 59.9,
    categoriaId: CATEGORIA_IDS.rendaBordado,
    tecnicaId: "tecnica-1",
    regiaoId: "regiao-1",
    artesaoId: "artesao-1",
    fotos: [{ url: "https://origem.test/fotos/toalha.jpg", ordem: 0 }],
    quantidadeEstoque: 3,
    quantidadeVendida: 0,
    notaMedia: 0,
    ativo: true,
    criadoEm: new Date().toISOString(),
    ...overrides,
  };
}

function criarUsuariosServiceFake(
  overrides: Partial<UsuariosService> = {}
): UsuariosService {
  return {
    list: vi.fn().mockResolvedValue([usuario()]),
    register: vi.fn(),
    login: vi.fn(),
    ...overrides,
  };
}

function criarPerfilServiceFake(
  overrides: Partial<PerfilArtesaoService> = {}
): PerfilArtesaoService {
  return {
    obter: vi.fn().mockResolvedValue(perfil()),
    salvar: vi.fn(),
    ...overrides,
  };
}

function criarProdutosServiceFake(
  overrides: Partial<ProdutosService> = {}
): ProdutosService {
  return {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    listByArtesao: vi.fn().mockResolvedValue([produto()]),
    update: vi.fn(),
    remove: vi.fn(),
    search: vi.fn().mockResolvedValue([]),
    obterPublico: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function criarOpcoesFiltroServiceFake(
  overrides: Partial<OpcoesFiltroService> = {}
): OpcoesFiltroService {
  return {
    categorias: vi.fn().mockResolvedValue([]),
    tecnicas: vi.fn().mockResolvedValue([{ id: "tecnica-1", nome: "Renda de Bilro" }]),
    regioes: vi.fn().mockResolvedValue([{ id: "regiao-1", nome: "Pilar, Recife" }]),
    ...overrides,
  };
}

interface Servicos {
  usuariosService: UsuariosService;
  perfilArtesaoService: PerfilArtesaoService;
  produtosService: ProdutosService;
  opcoesFiltroService: OpcoesFiltroService;
}

function renderizar(
  artesaoId: string | null,
  overrides: Partial<Servicos> = {}
) {
  const usuariosService = overrides.usuariosService ?? criarUsuariosServiceFake();
  const perfilArtesaoService =
    overrides.perfilArtesaoService ?? criarPerfilServiceFake();
  const produtosService = overrides.produtosService ?? criarProdutosServiceFake();
  const opcoesFiltroService =
    overrides.opcoesFiltroService ?? criarOpcoesFiltroServiceFake();

  const hook = renderHook(() =>
    usePerfilPublicoArtesao(
      usuariosService,
      perfilArtesaoService,
      produtosService,
      opcoesFiltroService,
      artesaoId
    )
  );

  return { ...hook, usuariosService, perfilArtesaoService, produtosService, opcoesFiltroService };
}

describe("usePerfilPublicoArtesao", () => {
  it("inicia em carregando quando todos os servicos estao disponiveis", () => {
    const { result } = renderizar("artesao-1", {
      usuariosService: criarUsuariosServiceFake({
        list: vi.fn().mockReturnValue(new Promise(() => {})),
      }),
    });

    expect(result.current.estado.status).toBe("carregando");
  });

  it("retorna sucesso com perfil, nomes de tecnica/regiao e produtos visiveis", async () => {
    const { result } = renderizar("artesao-1");

    await waitFor(() => expect(result.current.estado.status).toBe("sucesso"));

    if (result.current.estado.status !== "sucesso") throw new Error("esperado sucesso");
    expect(result.current.estado.usuario.nome).toBe("Maria das Rendas");
    expect(result.current.estado.perfil?.historia).toContain("avo no Pilar");
    expect(result.current.estado.tecnicaNome).toBe("Renda de Bilro");
    expect(result.current.estado.regiaoNome).toBe("Pilar, Recife");
    expect(result.current.estado.produtos).toHaveLength(1);
    expect(result.current.estado.usuario).not.toHaveProperty("email");
  });

  it("oculta produtos inativos ou sem estoque da grade publica", async () => {
    const { result } = renderizar("artesao-1", {
      produtosService: criarProdutosServiceFake({
        listByArtesao: vi
          .fn()
          .mockResolvedValue([
            produto({ id: "ativo", ativo: true, quantidadeEstoque: 2 }),
            produto({ id: "inativo", ativo: false, quantidadeEstoque: 2 }),
            produto({ id: "sem-estoque", ativo: true, quantidadeEstoque: 0 }),
          ]),
      }),
    });

    await waitFor(() => expect(result.current.estado.status).toBe("sucesso"));

    if (result.current.estado.status !== "sucesso") throw new Error("esperado sucesso");
    expect(result.current.estado.produtos.map((produto) => produto.id)).toEqual([
      "ativo",
    ]);
  });

  it("mantem perfil acessivel e incompleto quando nao ha perfil salvo", async () => {
    const { result } = renderizar("artesao-1", {
      perfilArtesaoService: criarPerfilServiceFake({
        obter: vi.fn().mockResolvedValue(null),
      }),
    });

    await waitFor(() => expect(result.current.estado.status).toBe("sucesso"));

    if (result.current.estado.status !== "sucesso") throw new Error("esperado sucesso");
    expect(result.current.estado.perfil).toBeNull();
    expect(result.current.estado.perfilCompleto).toBe(false);
  });

  it("retorna naoEncontrado quando o usuario nao existe", async () => {
    const { result } = renderizar("artesao-inexistente", {
      usuariosService: criarUsuariosServiceFake({
        list: vi.fn().mockResolvedValue([usuario({ id: "artesao-1" })]),
      }),
    });

    await waitFor(() => expect(result.current.estado.status).toBe("naoEncontrado"));
  });

  it("retorna naoEncontrado quando o usuario nao e artesao ativo", async () => {
    const { result } = renderizar("comprador-1", {
      usuariosService: criarUsuariosServiceFake({
        list: vi
          .fn()
          .mockResolvedValue([usuario({ id: "comprador-1", papel: "comprador" })]),
      }),
    });

    await waitFor(() => expect(result.current.estado.status).toBe("naoEncontrado"));
  });

  it("retorna erro quando algum servico falha", async () => {
    const { result } = renderizar("artesao-1", {
      produtosService: criarProdutosServiceFake({
        listByArtesao: vi.fn().mockRejectedValue(new Error("falhou")),
      }),
    });

    await waitFor(() => expect(result.current.estado.status).toBe("erro"));
  });

  it("recarregar busca os dados novamente apos erro", async () => {
    const listByArtesao = vi
      .fn()
      .mockRejectedValueOnce(new Error("falhou"))
      .mockResolvedValueOnce([produto()]);

    const { result } = renderizar("artesao-1", {
      produtosService: criarProdutosServiceFake({ listByArtesao }),
    });

    await waitFor(() => expect(result.current.estado.status).toBe("erro"));

    act(() => {
      result.current.recarregar();
    });

    await waitFor(() => expect(result.current.estado.status).toBe("sucesso"));
    expect(listByArtesao).toHaveBeenCalledTimes(2);
  });

  it("nao chama os servicos quando artesaoId e nulo", () => {
    const { usuariosService } = renderizar(null);

    expect(usuariosService.list).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PerfilArtesaoPublico } from "@/components/artesao/PerfilArtesaoPublico";
import { CATEGORIA_IDS } from "@/fake-api/seeds/categorias.seed";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { PerfilArtesaoService } from "@/services/contracts/perfil-artesao.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";
import type { UsuarioPublico } from "@/types/usuario";
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
    obter: vi.fn().mockResolvedValue({
      artesaoId: "artesao-1",
      historia: "Aprendi a arte da renda com minha avo no Pilar.",
      tecnicaId: "tecnica-1",
      regiaoId: "regiao-1",
    }),
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

describe("PerfilArtesaoPublico", () => {
  it("exibe historia, tecnica, regiao e grade de produtos ativos", async () => {
    render(
      <PerfilArtesaoPublico
        usuariosService={criarUsuariosServiceFake()}
        perfilArtesaoService={criarPerfilServiceFake()}
        produtosService={criarProdutosServiceFake()}
        opcoesFiltroService={criarOpcoesFiltroServiceFake()}
        artesaoId="artesao-1"
      />
    );

    await waitFor(() => expect(screen.getByText("Maria das Rendas")).toBeInTheDocument());
    expect(screen.getByText(/Aprendi a arte da renda/)).toBeInTheDocument();
    expect(screen.getByText("Renda de Bilro")).toBeInTheDocument();
    expect(screen.getByText("Pilar, Recife")).toBeInTheDocument();
    expect(screen.getByText("Toalha de Renda")).toBeInTheDocument();
  });

  it("nao quebra layout quando perfil esta incompleto", async () => {
    render(
      <PerfilArtesaoPublico
        usuariosService={criarUsuariosServiceFake()}
        perfilArtesaoService={criarPerfilServiceFake({
          obter: vi.fn().mockResolvedValue(null),
        })}
        produtosService={criarProdutosServiceFake()}
        opcoesFiltroService={criarOpcoesFiltroServiceFake()}
        artesaoId="artesao-1"
      />
    );

    await waitFor(() => expect(screen.getByText("Maria das Rendas")).toBeInTheDocument());
    expect(screen.queryByText("Renda de Bilro")).not.toBeInTheDocument();
  });

  it("nao renderiza fotoUrl com esquema diferente de http(s)", async () => {
    render(
      <PerfilArtesaoPublico
        usuariosService={criarUsuariosServiceFake()}
        perfilArtesaoService={criarPerfilServiceFake({
          obter: vi.fn().mockResolvedValue({
            artesaoId: "artesao-1",
            historia: "Historia valida.",
            tecnicaId: "tecnica-1",
            regiaoId: "regiao-1",
            fotoUrl: "javascript:alert(1)",
          }),
        })}
        produtosService={criarProdutosServiceFake()}
        opcoesFiltroService={criarOpcoesFiltroServiceFake()}
        artesaoId="artesao-1"
      />
    );

    await waitFor(() => expect(screen.getByText("Maria das Rendas")).toBeInTheDocument());
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("nao exibe produto inativo ou sem estoque", async () => {
    render(
      <PerfilArtesaoPublico
        usuariosService={criarUsuariosServiceFake()}
        perfilArtesaoService={criarPerfilServiceFake()}
        produtosService={criarProdutosServiceFake({
          listByArtesao: vi
            .fn()
            .mockResolvedValue([
              produto({ id: "ativo", nome: "Peca visivel" }),
              produto({ id: "inativo", nome: "Peca inativa", ativo: false }),
              produto({ id: "sem-estoque", nome: "Peca sem estoque", quantidadeEstoque: 0 }),
            ]),
        })}
        opcoesFiltroService={criarOpcoesFiltroServiceFake()}
        artesaoId="artesao-1"
      />
    );

    await waitFor(() => expect(screen.getByText("Peca visivel")).toBeInTheDocument());
    expect(screen.queryByText("Peca inativa")).not.toBeInTheDocument();
    expect(screen.queryByText("Peca sem estoque")).not.toBeInTheDocument();
  });

  it("exibe estado vazio quando o artesao nao possui produtos visiveis", async () => {
    render(
      <PerfilArtesaoPublico
        usuariosService={criarUsuariosServiceFake()}
        perfilArtesaoService={criarPerfilServiceFake()}
        produtosService={criarProdutosServiceFake({
          listByArtesao: vi.fn().mockResolvedValue([]),
        })}
        opcoesFiltroService={criarOpcoesFiltroServiceFake()}
        artesaoId="artesao-1"
      />
    );

    await waitFor(() =>
      expect(screen.getByText(/Nenhum produto disponivel/)).toBeInTheDocument()
    );
  });

  it("exibe estado de nao encontrado quando o artesao nao existe", async () => {
    render(
      <PerfilArtesaoPublico
        usuariosService={criarUsuariosServiceFake({
          list: vi.fn().mockResolvedValue([]),
        })}
        perfilArtesaoService={criarPerfilServiceFake()}
        produtosService={criarProdutosServiceFake()}
        opcoesFiltroService={criarOpcoesFiltroServiceFake()}
        artesaoId="artesao-inexistente"
      />
    );

    await waitFor(() =>
      expect(screen.getByText(/Artesao nao encontrado/)).toBeInTheDocument()
    );
  });

  it("exibe erro recuperavel quando o carregamento falha", async () => {
    render(
      <PerfilArtesaoPublico
        usuariosService={criarUsuariosServiceFake()}
        perfilArtesaoService={criarPerfilServiceFake()}
        produtosService={criarProdutosServiceFake({
          listByArtesao: vi.fn().mockRejectedValue(new Error("falhou")),
        })}
        opcoesFiltroService={criarOpcoesFiltroServiceFake()}
        artesaoId="artesao-1"
      />
    );

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
});

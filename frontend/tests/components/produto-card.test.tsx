import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProdutoCard } from "@/components/vitrine/ProdutoCard";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { UsuarioPublico } from "@/types/usuario";
import type { Produto } from "@/types/produto";

function produto(overrides: Partial<Produto> = {}): Produto {
  return {
    id: "produto-1",
    nome: "Jarra Ceramica Esculpida",
    descricao: "Jarra utilitaria com relevos entalhados a mao no torno.",
    preco: 89.9,
    categoriaId: "categoria-1",
    tecnicaId: "tecnica-1",
    regiaoId: "regiao-1",
    artesaoId: "artesao-1",
    fotos: [{ url: "https://origem.test/fotos/jarra.jpg", ordem: 0 }],
    quantidadeEstoque: 5,
    quantidadeVendida: 0,
    notaMedia: 0,
    ativo: true,
    criadoEm: new Date().toISOString(),
    ...overrides,
  };
}

function usuario(overrides: Partial<UsuarioPublico> = {}): UsuarioPublico {
  return {
    id: "artesao-1",
    nome: "Maria da Silva",
    email: "maria@origem.test",
    papel: "artesao",
    ativo: true,
    ...overrides,
  };
}

function criarUsuariosServiceFake(usuarios: UsuarioPublico[]): UsuariosService {
  return {
    list: vi.fn().mockResolvedValue(usuarios),
    register: vi.fn(),
    login: vi.fn(),
  };
}

describe("ProdutoCard", () => {
  it("mostra nome e preco do produto", () => {
    render(
      <ul>
        <ProdutoCard
          produto={produto()}
          usuariosService={null}
          onAdicionarAoCarrinho={vi.fn()}
        />
      </ul>
    );

    expect(screen.getByText("Jarra Ceramica Esculpida")).toBeInTheDocument();
    expect(screen.getByText("R$ 89.90")).toBeInTheDocument();
  });

  it("linka o card ao perfil publico do artesao correto", async () => {
    const service = criarUsuariosServiceFake([usuario({ id: "artesao-42", nome: "Joao Pereira" })]);

    render(
      <ul>
        <ProdutoCard
          produto={produto({ artesaoId: "artesao-42" })}
          usuariosService={service}
          onAdicionarAoCarrinho={vi.fn()}
        />
      </ul>
    );

    const link = await screen.findByRole("link", { name: /joao pereira/i });
    expect(link).toHaveAttribute("href", "/artesao/artesao-42");
  });

  it.each(Array.from({ length: 10 }, (_, indice) => indice))(
    "amostra %i: link aponta para o artesao dono do produto",
    async (indice) => {
      const artesaoId = `artesao-amostra-${indice}`;
      const service = criarUsuariosServiceFake([
        usuario({ id: artesaoId, nome: `Artesao Amostra ${indice}` }),
      ]);

      render(
        <ul>
          <ProdutoCard
            produto={produto({ id: `produto-amostra-${indice}`, artesaoId })}
            usuariosService={service}
            onAdicionarAoCarrinho={vi.fn()}
          />
        </ul>
      );

      const link = await screen.findByRole("link");
      expect(link).toHaveAttribute("href", `/artesao/${artesaoId}`);
      expect(link).toHaveAccessibleName(`Artesao Amostra ${indice}`);
    }
  );

  it("link e acessivel por teclado (tabIndex natural de ancora)", async () => {
    const service = criarUsuariosServiceFake([usuario()]);
    const usuarioTeste = userEvent.setup();

    render(
      <ul>
        <ProdutoCard produto={produto()} usuariosService={service} onAdicionarAoCarrinho={vi.fn()} />
      </ul>
    );

    const link = await screen.findByRole("link", { name: /maria da silva/i });

    await usuarioTeste.tab();
    expect(link).toHaveFocus();
  });

  it("usa texto descritivo mesmo antes do nome do artesao carregar", () => {
    render(
      <ul>
        <ProdutoCard produto={produto()} usuariosService={null} onAdicionarAoCarrinho={vi.fn()} />
      </ul>
    );

    const link = screen.getByRole("link");
    expect(link.textContent).toMatch(/artesao/i);
  });

  it("aciona onAdicionarAoCarrinho ao clicar no botao", async () => {
    const onAdicionarAoCarrinho = vi.fn();
    const usuarioTeste = userEvent.setup();
    const produtoTeste = produto();

    render(
      <ul>
        <ProdutoCard
          produto={produtoTeste}
          usuariosService={null}
          onAdicionarAoCarrinho={onAdicionarAoCarrinho}
        />
      </ul>
    );

    await usuarioTeste.click(screen.getByRole("button", { name: /adicionar ao carrinho/i }));

    expect(onAdicionarAoCarrinho).toHaveBeenCalledWith(produtoTeste);
  });

  it("mostra erro de carrinho vinculado ao botao por aria-describedby", () => {
    render(
      <ul>
        <ProdutoCard
          produto={produto()}
          usuariosService={null}
          onAdicionarAoCarrinho={vi.fn()}
          erroCarrinho="Estoque insuficiente"
        />
      </ul>
    );

    const alerta = screen.getByRole("alert");
    expect(alerta).toHaveTextContent("Estoque insuficiente");
    const botao = screen.getByRole("button", { name: /adicionar ao carrinho/i });
    expect(botao).toHaveAttribute("aria-describedby", alerta.id);
  });

  it("nao mostra alerta de erro quando nao ha erro de carrinho", () => {
    render(
      <ul>
        <ProdutoCard produto={produto()} usuariosService={null} onAdicionarAoCarrinho={vi.fn()} />
      </ul>
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FiltrosProdutos } from "@/components/vitrine/FiltrosProdutos";
import type { EstadoOpcoesFiltro } from "@/hooks/use-opcoes-filtro";

const OPCOES_SUCESSO: EstadoOpcoesFiltro = {
  status: "sucesso",
  categorias: [{ id: "categoria-ceramica-barro", nome: "Ceramica e Barro" }],
  tecnicas: [{ id: "tecnica-torno-ceramico", nome: "Torno Ceramico" }],
  regioes: [{ id: "regiao-pilar-recife", nome: "Comunidade do Pilar - Recife" }],
};

describe("FiltrosProdutos", () => {
  it("mostra as opcoes de categoria, tecnica e regiao vindas da Fake API", () => {
    render(
      <FiltrosProdutos query={{}} opcoes={OPCOES_SUCESSO} onAlterar={vi.fn()} />
    );

    expect(screen.getByRole("option", { name: "Ceramica e Barro" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Torno Ceramico" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Comunidade do Pilar - Recife" })
    ).toBeInTheDocument();
  });

  it("desabilita os selects enquanto as opcoes ainda carregam", () => {
    render(
      <FiltrosProdutos query={{}} opcoes={{ status: "carregando" }} onAlterar={vi.fn()} />
    );

    expect(screen.getByLabelText("Categoria")).toBeDisabled();
    expect(screen.getByLabelText("Tecnica")).toBeDisabled();
    expect(screen.getByLabelText("Regiao")).toBeDisabled();
  });

  it("digitar o termo apenas captura a selecao e delega ao callback", async () => {
    const onAlterar = vi.fn();
    render(<FiltrosProdutos query={{}} opcoes={OPCOES_SUCESSO} onAlterar={onAlterar} />);

    await userEvent.type(screen.getByLabelText("Buscar produtos"), "v");

    expect(onAlterar).toHaveBeenCalledWith({ termo: "v" });
  });

  it("selecionar uma categoria delega ao callback com o id escolhido", async () => {
    const onAlterar = vi.fn();
    render(<FiltrosProdutos query={{}} opcoes={OPCOES_SUCESSO} onAlterar={onAlterar} />);

    await userEvent.selectOptions(screen.getByLabelText("Categoria"), "categoria-ceramica-barro");

    expect(onAlterar).toHaveBeenCalledWith({ categoriaId: "categoria-ceramica-barro" });
  });

  it("voltar para a opcao Todas as tecnicas remove o filtro (undefined)", async () => {
    const onAlterar = vi.fn();
    render(
      <FiltrosProdutos
        query={{ tecnicaId: "tecnica-torno-ceramico" }}
        opcoes={OPCOES_SUCESSO}
        onAlterar={onAlterar}
      />
    );

    await userEvent.selectOptions(screen.getByLabelText("Tecnica"), "");

    expect(onAlterar).toHaveBeenCalledWith({ tecnicaId: undefined });
  });

  it("reflete os valores ja ativos vindos da URL", () => {
    render(
      <FiltrosProdutos
        query={{ termo: "vaso", regiaoId: "regiao-pilar-recife" }}
        opcoes={OPCOES_SUCESSO}
        onAlterar={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Buscar produtos")).toHaveValue("vaso");
    expect(screen.getByLabelText("Regiao")).toHaveValue("regiao-pilar-recife");
  });
});

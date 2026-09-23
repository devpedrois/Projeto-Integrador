import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PerfilArtesaoForm } from "@/components/painel-artesao/PerfilArtesaoForm";
import { ServiceError } from "@/services/errors";
import { TECNICA_IDS, TECNICAS_SEED } from "@/fake-api/seeds/tecnicas.seed";
import { REGIAO_IDS, REGIOES_SEED } from "@/fake-api/seeds/regioes.seed";
import type { PerfilArtesaoService } from "@/services/contracts/perfil-artesao.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";
import type { PerfilArtesao } from "@/types/perfil-artesao";

const ARTESAO_ID_SESSAO = "artesao-sessao-1";

function perfilCompleto(overrides: Partial<PerfilArtesao> = {}): PerfilArtesao {
  return {
    artesaoId: ARTESAO_ID_SESSAO,
    historia: "Historia previamente salva sobre a origem da peca.",
    tecnicaId: TECNICA_IDS.marcenariaArtesanal,
    regiaoId: REGIAO_IDS.pilarRecife,
    fotoUrl: "https://origem.test/perfis/artesao.jpg",
    ...overrides,
  };
}

function criarPerfilServicoFake(
  overrides: Partial<PerfilArtesaoService> = {}
): PerfilArtesaoService {
  return {
    obter: vi.fn().mockResolvedValue(null),
    salvar: vi.fn().mockResolvedValue(perfilCompleto()),
    ...overrides,
  };
}

function criarOpcoesServicoFake(): OpcoesFiltroService {
  return {
    categorias: vi.fn().mockResolvedValue([]),
    tecnicas: vi.fn().mockResolvedValue(TECNICAS_SEED),
    regioes: vi.fn().mockResolvedValue(REGIOES_SEED),
  };
}

async function preencherFormularioValido(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText(/historia/i),
    "Historia com detalhes suficientes sobre a origem da peca."
  );
  await user.selectOptions(
    screen.getByLabelText(/tecnica/i),
    TECNICA_IDS.marcenariaArtesanal
  );
  await user.selectOptions(screen.getByLabelText(/regiao/i), REGIAO_IDS.pilarRecife);
}

describe("PerfilArtesaoForm", () => {
  it("mostra loading enquanto carrega perfil e opcoes", () => {
    const pendente = new Promise<PerfilArtesao | null>(() => {});
    render(
      <PerfilArtesaoForm
        service={criarPerfilServicoFake({ obter: vi.fn().mockReturnValue(pendente) })}
        opcoesFiltroService={criarOpcoesServicoFake()}
        artesaoId={ARTESAO_ID_SESSAO}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent(/carregando/i);
  });

  it("cenario US03 - perfil completo: preenche historia, tecnica e regiao e confirma sucesso", async () => {
    const user = userEvent.setup();
    const salvarSpy = vi.fn().mockResolvedValue(perfilCompleto());
    render(
      <PerfilArtesaoForm
        service={criarPerfilServicoFake({ salvar: salvarSpy })}
        opcoesFiltroService={criarOpcoesServicoFake()}
        artesaoId={ARTESAO_ID_SESSAO}
      />
    );

    await waitFor(() => expect(screen.getByLabelText(/historia/i)).toBeInTheDocument());
    await preencherFormularioValido(user);
    await user.click(screen.getByRole("button", { name: /salvar perfil/i }));

    await waitFor(() => expect(salvarSpy).toHaveBeenCalledTimes(1));
    const [entrada, artesaoId] = salvarSpy.mock.calls[0] as [unknown, string];
    expect(artesaoId).toBe(ARTESAO_ID_SESSAO);
    expect(entrada).not.toHaveProperty("artesaoId");
    expect(await screen.findByRole("status")).toHaveTextContent(/salvo/i);
  });

  it("cenario US03 - perfil incompleto: deixar tecnica em branco bloqueia envio e mostra erro no campo", async () => {
    const user = userEvent.setup();
    const salvarSpy = vi.fn();
    render(
      <PerfilArtesaoForm
        service={criarPerfilServicoFake({ salvar: salvarSpy })}
        opcoesFiltroService={criarOpcoesServicoFake()}
        artesaoId={ARTESAO_ID_SESSAO}
      />
    );

    await waitFor(() => expect(screen.getByLabelText(/historia/i)).toBeInTheDocument());
    await user.type(
      screen.getByLabelText(/historia/i),
      "Historia preenchida mas sem tecnica nem regiao selecionadas."
    );
    await user.click(screen.getByRole("button", { name: /salvar perfil/i }));

    expect(await screen.findByText(/tecnica valida/i)).toBeInTheDocument();
    expect(screen.getByText(/regiao valida/i)).toBeInTheDocument();
    expect(salvarSpy).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByLabelText(/tecnica/i));
  });

  it("pre-preenche os campos quando o artesao ja possui perfil salvo", async () => {
    render(
      <PerfilArtesaoForm
        service={criarPerfilServicoFake({
          obter: vi.fn().mockResolvedValue(perfilCompleto()),
        })}
        opcoesFiltroService={criarOpcoesServicoFake()}
        artesaoId={ARTESAO_ID_SESSAO}
      />
    );

    expect(
      await screen.findByDisplayValue(/historia previamente salva/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/tecnica/i)).toHaveValue(
      TECNICA_IDS.marcenariaArtesanal
    );
    expect(screen.getByLabelText(/regiao/i)).toHaveValue(REGIAO_IDS.pilarRecife);
  });

  it("mostra contador de caracteres da historia e bloqueia acima de 1000 caracteres", async () => {
    const user = userEvent.setup();
    const salvarSpy = vi.fn();
    render(
      <PerfilArtesaoForm
        service={criarPerfilServicoFake({ salvar: salvarSpy })}
        opcoesFiltroService={criarOpcoesServicoFake()}
        artesaoId={ARTESAO_ID_SESSAO}
      />
    );

    await waitFor(() => expect(screen.getByLabelText(/historia/i)).toBeInTheDocument());
    expect(screen.getByText("0/1000")).toBeInTheDocument();

    const campoHistoria = screen.getByLabelText(/historia/i);
    fireEvent.change(campoHistoria, { target: { value: "a".repeat(1001) } });
    await user.selectOptions(
      screen.getByLabelText(/tecnica/i),
      TECNICA_IDS.marcenariaArtesanal
    );
    await user.selectOptions(screen.getByLabelText(/regiao/i), REGIAO_IDS.pilarRecife);
    await user.click(screen.getByRole("button", { name: /salvar perfil/i }));

    expect(await screen.findByText(/ate 1000 caracteres/i)).toBeInTheDocument();
    expect(screen.getByText("1001/1000")).toBeInTheDocument();
    expect(salvarSpy).not.toHaveBeenCalled();
  });

  it("mostra erro recuperavel quando o carregamento falha e permite tentar novamente", async () => {
    const obterSpy = vi
      .fn()
      .mockRejectedValueOnce(new Error("falha de rede"))
      .mockResolvedValueOnce(null);
    const user = userEvent.setup();
    render(
      <PerfilArtesaoForm
        service={criarPerfilServicoFake({ obter: obterSpy })}
        opcoesFiltroService={criarOpcoesServicoFake()}
        artesaoId={ARTESAO_ID_SESSAO}
      />
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/nao foi possivel/i);
    await user.click(screen.getByRole("button", { name: /tentar novamente/i }));

    await waitFor(() => expect(screen.getByLabelText(/historia/i)).toBeInTheDocument());
  });

  it("mostra erro recuperavel quando salvar falha e mantem o botao habilitado", async () => {
    const user = userEvent.setup();
    const salvarSpy = vi
      .fn()
      .mockRejectedValue(
        new ServiceError("PERFIL_ARTESAO_INVALIDO", "Falha ao salvar perfil.")
      );
    render(
      <PerfilArtesaoForm
        service={criarPerfilServicoFake({ salvar: salvarSpy })}
        opcoesFiltroService={criarOpcoesServicoFake()}
        artesaoId={ARTESAO_ID_SESSAO}
      />
    );

    await waitFor(() => expect(screen.getByLabelText(/historia/i)).toBeInTheDocument());
    await preencherFormularioValido(user);
    await user.click(screen.getByRole("button", { name: /salvar perfil/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/nao foi possivel salvar/i);
    expect(screen.getByRole("button", { name: /salvar perfil/i })).not.toBeDisabled();
  });
});

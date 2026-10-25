import { afterEach, describe, expect, it, vi } from "vitest";
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
afterEach(() => vi.unstubAllGlobals());

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
  overrides: Partial<PerfilArtesaoService> = {},
): PerfilArtesaoService {
  return {
    obter: vi.fn().mockResolvedValue(null),
    salvar: vi.fn().mockResolvedValue(perfilCompleto()),
    enviarFoto: vi.fn().mockResolvedValue(perfilCompleto()),
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

async function preencherFormularioValido(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.type(
    screen.getByLabelText(/história/i),
    "Historia com detalhes suficientes sobre a origem da peca.",
  );
  await user.selectOptions(
    screen.getByLabelText(/técnica/i),
    TECNICA_IDS.marcenariaArtesanal,
  );
  await user.selectOptions(
    screen.getByLabelText(/região/i),
    REGIAO_IDS.pilarRecife,
  );
}

describe("PerfilArtesaoForm", () => {
  it("Web.6 mostra previa local e salva URL retornada sem reenviar URL antiga", async () => {
    const criarUrl = vi.fn().mockReturnValue("blob:previa-local");
    const revogarUrl = vi.fn();
    vi.stubGlobal(
      "URL",
      class extends URL {
        static override createObjectURL = criarUrl;
        static override revokeObjectURL = revogarUrl;
      },
    );
    const enviarFoto = vi
      .fn()
      .mockResolvedValue(
        perfilCompleto({ fotoUrl: "https://blob.example.test/nova.jpg" }),
      );
    const salvar = vi
      .fn()
      .mockResolvedValue(
        perfilCompleto({ fotoUrl: "https://blob.example.test/nova.jpg" }),
      );
    render(
      <PerfilArtesaoForm
        service={criarPerfilServicoFake({
          obter: vi.fn().mockResolvedValue(perfilCompleto()),
          enviarFoto,
          salvar,
        })}
        opcoesFiltroService={criarOpcoesServicoFake()}
        artesaoId={ARTESAO_ID_SESSAO}
        nomeArtesao="Ana"
      />,
    );
    const campo = await screen.findByLabelText(/^foto do perfil/i);
    const arquivo = new File(
      [new Uint8Array([255, 216, 255, 224])],
      "foto.jpg",
      { type: "image/jpeg" },
    );
    fireEvent.change(campo, { target: { files: [arquivo] } });
    await waitFor(() =>
      expect(screen.getByRole("img", { name: "Ana" })).toHaveAttribute(
        "src",
        "blob:previa-local",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: /salvar perfil/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/salvo/i);
    expect(enviarFoto).toHaveBeenCalledWith(arquivo, ARTESAO_ID_SESSAO);
    expect(salvar.mock.calls[0]?.[0]).not.toHaveProperty("fotoUrl");
    await waitFor(() =>
      expect(screen.getByRole("img", { name: "Ana" })).toHaveAttribute(
        "src",
        "https://blob.example.test/nova.jpg",
      ),
    );
    expect(revogarUrl).toHaveBeenCalledWith("blob:previa-local");
  });
  it.each([
    [
      "PNG de 3 MB",
      new File([new Uint8Array(3 * 1024 * 1024)], "foto.png", {
        type: "image/png",
      }),
      /2 MB/,
    ],
    [
      "GIF",
      new File(["GIF89a"], "foto.gif", { type: "image/gif" }),
      /JPG ou PNG/,
    ],
  ])("Web.6 rejeita %s no formulario", async (_nome, arquivo, mensagem) => {
    render(
      <PerfilArtesaoForm
        service={criarPerfilServicoFake()}
        opcoesFiltroService={criarOpcoesServicoFake()}
        artesaoId={ARTESAO_ID_SESSAO}
      />,
    );
    fireEvent.change(await screen.findByLabelText(/^foto do perfil/i), {
      target: { files: [arquivo] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(mensagem);
    expect(
      screen.getByRole("button", { name: /salvar perfil/i }),
    ).toBeDisabled();
  });
  it("Web.6 rejeita PDF renomeado sem enviar ou exibir previa", async () => {
    render(
      <PerfilArtesaoForm
        service={criarPerfilServicoFake()}
        opcoesFiltroService={criarOpcoesServicoFake()}
        artesaoId={ARTESAO_ID_SESSAO}
      />,
    );
    const campo = await screen.findByLabelText(/^foto do perfil/i);
    fireEvent.change(campo, {
      target: {
        files: [new File(["%PDF-1.7"], "foto.jpg", { type: "image/jpeg" })],
      },
    });
    expect(
      await screen.findByText(/conteúdo.*JPG ou PNG/i),
    ).toBeInTheDocument();
  });
  it("mostra loading enquanto carrega perfil e opcoes", () => {
    const pendente = new Promise<PerfilArtesao | null>(() => {});
    render(
      <PerfilArtesaoForm
        service={criarPerfilServicoFake({
          obter: vi.fn().mockReturnValue(pendente),
        })}
        opcoesFiltroService={criarOpcoesServicoFake()}
        artesaoId={ARTESAO_ID_SESSAO}
      />,
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
      />,
    );

    await waitFor(() =>
      expect(screen.getByLabelText(/história/i)).toBeInTheDocument(),
    );
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
      />,
    );

    await waitFor(() =>
      expect(screen.getByLabelText(/história/i)).toBeInTheDocument(),
    );
    await user.type(
      screen.getByLabelText(/história/i),
      "Historia preenchida mas sem tecnica nem regiao selecionadas.",
    );
    await user.click(screen.getByRole("button", { name: /salvar perfil/i }));

    expect(await screen.findByText(/técnica válida/i)).toBeInTheDocument();
    expect(screen.getByText(/região válida/i)).toBeInTheDocument();
    expect(salvarSpy).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByLabelText(/técnica/i));
  });

  it("pre-preenche os campos quando o artesao ja possui perfil salvo", async () => {
    render(
      <PerfilArtesaoForm
        service={criarPerfilServicoFake({
          obter: vi.fn().mockResolvedValue(perfilCompleto()),
        })}
        opcoesFiltroService={criarOpcoesServicoFake()}
        artesaoId={ARTESAO_ID_SESSAO}
      />,
    );

    expect(
      await screen.findByDisplayValue(/historia previamente salva/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/técnica/i)).toHaveValue(
      TECNICA_IDS.marcenariaArtesanal,
    );
    expect(screen.getByLabelText(/região/i)).toHaveValue(
      REGIAO_IDS.pilarRecife,
    );
  });

  it("mostra contador de caracteres da historia e bloqueia acima de 1000 caracteres", async () => {
    const user = userEvent.setup();
    const salvarSpy = vi.fn();
    render(
      <PerfilArtesaoForm
        service={criarPerfilServicoFake({ salvar: salvarSpy })}
        opcoesFiltroService={criarOpcoesServicoFake()}
        artesaoId={ARTESAO_ID_SESSAO}
      />,
    );

    await waitFor(() =>
      expect(screen.getByLabelText(/história/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("0/1000")).toBeInTheDocument();

    const campoHistoria = screen.getByLabelText(/história/i);
    fireEvent.change(campoHistoria, { target: { value: "a".repeat(1001) } });
    await user.selectOptions(
      screen.getByLabelText(/técnica/i),
      TECNICA_IDS.marcenariaArtesanal,
    );
    await user.selectOptions(
      screen.getByLabelText(/região/i),
      REGIAO_IDS.pilarRecife,
    );
    await user.click(screen.getByRole("button", { name: /salvar perfil/i }));

    expect(await screen.findByText(/até 1000 caracteres/i)).toBeInTheDocument();
    expect(screen.getByText("1001/1000")).toBeInTheDocument();
    expect(salvarSpy).not.toHaveBeenCalled();
  });

  it("previa do perfil publico mostra nome, tecnica e a historia digitada", async () => {
    const user = userEvent.setup();
    render(
      <PerfilArtesaoForm
        service={criarPerfilServicoFake()}
        opcoesFiltroService={criarOpcoesServicoFake()}
        artesaoId={ARTESAO_ID_SESSAO}
        nomeArtesao="João Artesão"
      />,
    );

    const previa = await screen.findByRole("complementary", {
      name: /prévia do perfil público/i,
    });
    expect(previa).toHaveTextContent("João Artesão");
    expect(previa).toHaveTextContent(/sua história aparece aqui/i);

    await user.type(screen.getByLabelText(/história/i), "Aprendi com meu pai.");
    await user.selectOptions(
      screen.getByLabelText(/técnica/i),
      TECNICA_IDS.marcenariaArtesanal,
    );

    expect(previa).toHaveTextContent("Aprendi com meu pai.");
    expect(previa).toHaveTextContent("Marcenaria Artesanal");
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
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /não foi possível/i,
    );
    await user.click(screen.getByRole("button", { name: /tentar novamente/i }));

    await waitFor(() =>
      expect(screen.getByLabelText(/história/i)).toBeInTheDocument(),
    );
  });

  it("mostra erro recuperavel quando salvar falha e mantem o botao habilitado", async () => {
    const user = userEvent.setup();
    const salvarSpy = vi
      .fn()
      .mockRejectedValue(
        new ServiceError("PERFIL_ARTESAO_INVALIDO", "Falha ao salvar perfil."),
      );
    render(
      <PerfilArtesaoForm
        service={criarPerfilServicoFake({ salvar: salvarSpy })}
        opcoesFiltroService={criarOpcoesServicoFake()}
        artesaoId={ARTESAO_ID_SESSAO}
      />,
    );

    await waitFor(() =>
      expect(screen.getByLabelText(/história/i)).toBeInTheDocument(),
    );
    await preencherFormularioValido(user);
    await user.click(screen.getByRole("button", { name: /salvar perfil/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /não foi possível salvar/i,
    );
    expect(
      screen.getByRole("button", { name: /salvar perfil/i }),
    ).not.toBeDisabled();
  });
});

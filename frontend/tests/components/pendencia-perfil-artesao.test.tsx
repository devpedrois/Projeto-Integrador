import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PendenciaPerfilArtesao } from "@/components/painel-artesao/PendenciaPerfilArtesao";
import { TECNICA_IDS } from "@/fake-api/seeds/tecnicas.seed";
import { REGIAO_IDS } from "@/fake-api/seeds/regioes.seed";
import type { PerfilArtesaoService } from "@/services/contracts/perfil-artesao.contract";
import type { PerfilArtesao } from "@/types/perfil-artesao";

const ARTESAO_ID_SESSAO = "artesao-sessao-1";

function criarServicoFake(obter: PerfilArtesaoService["obter"]): PerfilArtesaoService {
  return { obter, salvar: vi.fn() };
}

describe("PendenciaPerfilArtesao", () => {
  it("mostra loading enquanto verifica o perfil", () => {
    const service = criarServicoFake(vi.fn().mockReturnValue(new Promise(() => {})));

    render(<PendenciaPerfilArtesao service={service} artesaoId={ARTESAO_ID_SESSAO} />);

    expect(screen.getByRole("status")).toHaveTextContent(/verificando/i);
  });

  it("perfil incompleto lista os campos pendentes e leva para Meu perfil", async () => {
    const service = criarServicoFake(vi.fn().mockResolvedValue(null));

    render(<PendenciaPerfilArtesao service={service} artesaoId={ARTESAO_ID_SESSAO} />);

    await screen.findByText(/complete seu perfil/i);
    const aviso = screen.getByRole("status");
    expect(aviso).toHaveTextContent(/história, técnica principal, região/i);
    expect(screen.getByRole("link", { name: /ir para meu perfil/i })).toHaveAttribute(
      "href",
      "/painel-artesao/perfil"
    );
  });

  it("perfil completo nao mostra aviso", async () => {
    const perfil: PerfilArtesao = {
      artesaoId: ARTESAO_ID_SESSAO,
      historia: "Historia completa.",
      tecnicaId: TECNICA_IDS.marcenariaArtesanal,
      regiaoId: REGIAO_IDS.pilarRecife,
    };
    const obter = vi.fn().mockResolvedValue(perfil);

    render(
      <PendenciaPerfilArtesao service={criarServicoFake(obter)} artesaoId={ARTESAO_ID_SESSAO} />
    );

    await waitFor(() => expect(obter).toHaveBeenCalledWith(ARTESAO_ID_SESSAO));
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("mostra erro quando a verificacao falha", async () => {
    const service = criarServicoFake(vi.fn().mockRejectedValue(new Error("falhou")));

    render(<PendenciaPerfilArtesao service={service} artesaoId={ARTESAO_ID_SESSAO} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/não foi possível verificar/i);
  });
});
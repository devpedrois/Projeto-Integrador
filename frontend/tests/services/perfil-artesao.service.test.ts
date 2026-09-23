import { beforeEach, describe, expect, it } from "vitest";
import { BrowserPerfilArtesaoRepository } from "@/fake-api/repositories/perfil-artesao.repository";
import { FakePerfilArtesaoService } from "@/services/fake/perfil-artesao.service";
import { TECNICA_IDS } from "@/fake-api/seeds/tecnicas.seed";
import { REGIAO_IDS } from "@/fake-api/seeds/regioes.seed";
import { ServiceError } from "@/services/errors";
import type { PerfilArtesaoInput } from "@/types/perfil-artesao";

const CHAVE_TESTE = "origem:test:perfis-artesao:service:v1";

function entradaValida(
  overrides: Partial<PerfilArtesaoInput> = {}
): PerfilArtesaoInput {
  return {
    historia: "Historia com detalhes suficientes sobre a origem da peca.",
    tecnicaId: TECNICA_IDS.marcenariaArtesanal,
    regiaoId: REGIAO_IDS.pilarRecife,
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.removeItem(CHAVE_TESTE);
});

describe("FakePerfilArtesaoService.obter", () => {
  it("retorna null quando o artesao ainda nao possui perfil salvo", async () => {
    const repo = new BrowserPerfilArtesaoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakePerfilArtesaoService(repo, { latenciaMs: 0 });

    const perfil = await service.obter("artesao-sem-perfil");

    expect(perfil).toBeNull();
  });

  it("retorna o perfil semeado do artesao informado", async () => {
    const repo = new BrowserPerfilArtesaoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakePerfilArtesaoService(repo, { latenciaMs: 0 });

    const perfil = await service.obter("seed-artesao-01");

    expect(perfil?.artesaoId).toBe("seed-artesao-01");
  });
});

describe("FakePerfilArtesaoService.salvar", () => {
  it("cria o perfil vinculado ao artesao da sessao, ignorando artesaoId da entrada", async () => {
    const repo = new BrowserPerfilArtesaoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakePerfilArtesaoService(repo, { latenciaMs: 0 });

    const entrada = entradaValida();
    (entrada as unknown as Record<string, unknown>).artesaoId = "artesao-forjado";
    const salvo = await service.salvar(entrada, "artesao-da-sessao");

    expect(salvo.artesaoId).toBe("artesao-da-sessao");
    expect(salvo.historia).toBe(entrada.historia);
  });

  it("perfil salvo persiste e e recuperavel por obter", async () => {
    const repo = new BrowserPerfilArtesaoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakePerfilArtesaoService(repo, { latenciaMs: 0 });

    await service.salvar(entradaValida(), "artesao-da-sessao");
    const perfil = await service.obter("artesao-da-sessao");

    expect(perfil?.historia).toBe(entradaValida().historia);
  });

  it("atualizar o proprio perfil substitui o anterior sem duplicar", async () => {
    const repo = new BrowserPerfilArtesaoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakePerfilArtesaoService(repo, { latenciaMs: 0 });

    await service.salvar(entradaValida(), "artesao-da-sessao");
    await service.salvar(entradaValida({ historia: "Historia revisada e atualizada." }), "artesao-da-sessao");

    const perfil = await service.obter("artesao-da-sessao");
    const todos = await repo.list();

    expect(perfil?.historia).toBe("Historia revisada e atualizada.");
    expect(todos.filter((p) => p.artesaoId === "artesao-da-sessao")).toHaveLength(1);
  });

  it("rejeita historia acima de 1000 caracteres sem salvar", async () => {
    const repo = new BrowserPerfilArtesaoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakePerfilArtesaoService(repo, { latenciaMs: 0 });

    await expect(
      service.salvar(entradaValida({ historia: "a".repeat(1001) }), "artesao-da-sessao")
    ).rejects.toBeInstanceOf(ServiceError);

    const perfil = await service.obter("artesao-da-sessao");
    expect(perfil).toBeNull();
  });

  it("nao altera o perfil de outro artesao ao salvar com um artesaoId de sessao diferente", async () => {
    const repo = new BrowserPerfilArtesaoRepository(window.localStorage, CHAVE_TESTE);
    const service = new FakePerfilArtesaoService(repo, { latenciaMs: 0 });

    await service.salvar(entradaValida(), "artesao-a");
    await service.salvar(
      entradaValida({ historia: "Historia do artesao b, completamente diferente." }),
      "artesao-b"
    );

    const perfilA = await service.obter("artesao-a");
    const perfilB = await service.obter("artesao-b");

    expect(perfilA?.historia).toBe(entradaValida().historia);
    expect(perfilB?.historia).toBe("Historia do artesao b, completamente diferente.");
  });
});

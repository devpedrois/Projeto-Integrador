import { beforeEach, describe, expect, it } from "vitest";
import { BrowserPerfilArtesaoRepository } from "@/fake-api/repositories/perfil-artesao.repository";

const CHAVE_TESTE = "origem:test:perfis-artesao:repository:v1";

beforeEach(() => {
  window.localStorage.removeItem(CHAVE_TESTE);
});

describe("BrowserPerfilArtesaoRepository", () => {
  it("seed popula exatamente dois perfis na primeira execucao", async () => {
    const repo = new BrowserPerfilArtesaoRepository(window.localStorage, CHAVE_TESTE);

    await repo.seed();
    const perfis = await repo.list();

    expect(perfis).toHaveLength(2);
  });

  it("seed e idempotente e nao sobrescreve alteracoes existentes", async () => {
    const repo = new BrowserPerfilArtesaoRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();
    const perfis = await repo.list();
    const primeiro = perfis[0];
    if (!primeiro) throw new Error("seed deveria conter ao menos um perfil");
    const alterado = { ...primeiro, historia: "Historia alterada manualmente" };
    window.localStorage.setItem(
      CHAVE_TESTE,
      JSON.stringify([alterado, ...perfis.slice(1)])
    );

    await repo.seed();
    const perfisDepois = await repo.list();
    const primeiroDepois = perfisDepois[0];

    expect(primeiroDepois?.historia).toBe("Historia alterada manualmente");
    expect(perfisDepois).toHaveLength(2);
  });

  it("findByArtesaoId retorna o perfil correspondente", async () => {
    const repo = new BrowserPerfilArtesaoRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();
    const perfis = await repo.list();
    const alvo = perfis[0];
    if (!alvo) throw new Error("seed deveria conter ao menos um perfil");

    const encontrado = await repo.findByArtesaoId(alvo.artesaoId);

    expect(encontrado).toEqual(alvo);
  });

  it("findByArtesaoId retorna null quando o perfil nao existe", async () => {
    const repo = new BrowserPerfilArtesaoRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();

    const encontrado = await repo.findByArtesaoId("artesao-inexistente");

    expect(encontrado).toBeNull();
  });

  it("upsert cria um novo perfil quando o artesao ainda nao possui um", async () => {
    const repo = new BrowserPerfilArtesaoRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();

    const novo = {
      artesaoId: "artesao-teste-1",
      historia: "Historia de teste.",
      tecnicaId: "tecnica-teste",
      regiaoId: "regiao-teste",
    };

    const salvo = await repo.upsert(novo);
    const encontrado = await repo.findByArtesaoId("artesao-teste-1");

    expect(salvo).toEqual(novo);
    expect(encontrado).toEqual(novo);
  });

  it("upsert substitui o perfil existente do mesmo artesao e preserva os demais", async () => {
    const repo = new BrowserPerfilArtesaoRepository(window.localStorage, CHAVE_TESTE);
    await repo.seed();
    const perfis = await repo.list();
    const alvo = perfis[0];
    if (!alvo) throw new Error("seed deveria conter ao menos um perfil");

    const atualizado = {
      ...alvo,
      historia: "Historia atualizada via upsert.",
    };
    await repo.upsert(atualizado);

    const todos = await repo.list();
    const encontrado = await repo.findByArtesaoId(alvo.artesaoId);

    expect(todos).toHaveLength(perfis.length);
    expect(encontrado?.historia).toBe("Historia atualizada via upsert.");
  });

  it("dados sobrevivem a uma nova instancia apontando para a mesma chave", async () => {
    const primeiraInstancia = new BrowserPerfilArtesaoRepository(
      window.localStorage,
      CHAVE_TESTE
    );
    await primeiraInstancia.seed();
    await primeiraInstancia.upsert({
      artesaoId: "artesao-teste-2",
      historia: "Historia persistente.",
      tecnicaId: "tecnica-teste",
      regiaoId: "regiao-teste",
    });

    const segundaInstancia = new BrowserPerfilArtesaoRepository(
      window.localStorage,
      CHAVE_TESTE
    );
    const encontrado = await segundaInstancia.findByArtesaoId("artesao-teste-2");

    expect(encontrado?.historia).toBe("Historia persistente.");
  });
});

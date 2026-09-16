import { describe, expect, it } from "vitest";
import { FakeOpcoesFiltroService } from "@/services/fake/opcoes-filtro.service";
import { CATEGORIAS_SEED } from "@/fake-api/seeds/categorias.seed";
import { TECNICAS_SEED } from "@/fake-api/seeds/tecnicas.seed";
import { REGIOES_SEED } from "@/fake-api/seeds/regioes.seed";

describe("FakeOpcoesFiltroService", () => {
  it("categorias() retorna uma Promise com a mesma massa da Fake API", async () => {
    const service = new FakeOpcoesFiltroService({ latenciaMs: 0 });

    const resultado = service.categorias();

    expect(resultado).toBeInstanceOf(Promise);
    await expect(resultado).resolves.toEqual(CATEGORIAS_SEED);
  });

  it("tecnicas() retorna a mesma massa de tecnicas da Fake API", async () => {
    const service = new FakeOpcoesFiltroService({ latenciaMs: 0 });

    await expect(service.tecnicas()).resolves.toEqual(TECNICAS_SEED);
  });

  it("regioes() retorna a mesma massa de regioes da Fake API", async () => {
    const service = new FakeOpcoesFiltroService({ latenciaMs: 0 });

    await expect(service.regioes()).resolves.toEqual(REGIOES_SEED);
  });

  it("respeita a latencia configurada", async () => {
    const service = new FakeOpcoesFiltroService({ latenciaMs: 30 });

    const inicio = Date.now();
    await service.categorias();
    const duracao = Date.now() - inicio;

    expect(duracao).toBeGreaterThanOrEqual(25);
  });
});

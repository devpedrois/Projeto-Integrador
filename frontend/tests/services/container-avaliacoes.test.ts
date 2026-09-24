import { beforeEach, describe, expect, it } from "vitest";
import { obterAvaliacoesService } from "@/services/fake/container";

beforeEach(() => {
  window.localStorage.removeItem("origem:v1:avaliacoes");
});

describe("obterAvaliacoesService", () => {
  it("expõe o recurso de avaliacoes pela camada organizada", async () => {
    const service = obterAvaliacoesService();

    expect(obterAvaliacoesService()).toBe(service);
    expect((await service.listByProduto("produto-seed-01")).length).toBeGreaterThan(0);
  }, 5000);
});

import { describe, expect, it } from "vitest";
import {
  validarAvaliacao,
  validarAvaliacaoHttp,
} from "@/validators/avaliacao.validator";

const produtoId = "11111111-1111-4111-8111-111111111111";
describe("Web.3 validacao de avaliacao", () => {
  it("preserva as regras de UUID usadas pelo schema do servidor", () => {
    expect(
      validarAvaliacaoHttp({
        produtoId: "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
        nota: 5,
      }),
    ).toHaveProperty("produtoId");
    expect(
      validarAvaliacaoHttp({
        produtoId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa".toUpperCase(),
        nota: 5,
      }),
    ).toEqual({});
  });
  it.each([0, 6, 3.5, NaN])("rejeita nota %s", (nota) => {
    expect(validarAvaliacao({ produtoId, nota })).toHaveProperty("nota");
  });
  it("aceita limites e aplica o limite do comentario apos trim", () => {
    expect(
      validarAvaliacaoHttp({
        produtoId,
        nota: 1,
        comentario: ` ${"a".repeat(500)} `,
      }),
    ).toEqual({});
    expect(validarAvaliacaoHttp({ produtoId, nota: 5 })).toEqual({});
    expect(
      validarAvaliacao({ produtoId, nota: 5, comentario: "a".repeat(501) }),
    ).toHaveProperty("comentario");
  });
  it("rejeita campos extras e exige UUID somente no transporte HTTP", () => {
    expect(
      validarAvaliacaoHttp({ produtoId, nota: 5, ...{ compradorId: "outro" } }),
    ).toHaveProperty("produtoId");
    expect(
      validarAvaliacaoHttp({ produtoId: "produto-seed-30", nota: 5 }),
    ).toHaveProperty("produtoId");
    expect(validarAvaliacao({ produtoId: "produto-seed-30", nota: 5 })).toEqual(
      {},
    );
  });
});

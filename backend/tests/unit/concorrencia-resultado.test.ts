import { expect, it } from "vitest";
import { validarRodada } from "../../scripts/concorrencia-checkout.js";

it("aceita uma unica venda do ultimo item para cinco compradores", () => {
  expect(
    validarRodada(
      { sucessos: 1, conflitos409: 4, estoqueFinal: 0, pedidosProduto: 1 },
      5,
    ),
  ).toEqual([]);
});

it.each([
  { sucessos: 2, conflitos409: 3, estoqueFinal: 0, pedidosProduto: 1 },
  { sucessos: 0, conflitos409: 5, estoqueFinal: 0, pedidosProduto: 1 },
  { sucessos: 1, conflitos409: 3, estoqueFinal: 0, pedidosProduto: 1 },
  { sucessos: 1, conflitos409: 4, estoqueFinal: -1, pedidosProduto: 1 },
  { sucessos: 1, conflitos409: 4, estoqueFinal: 1, pedidosProduto: 1 },
  { sucessos: 1, conflitos409: 4, estoqueFinal: 0, pedidosProduto: 0 },
  { sucessos: 1, conflitos409: 4, estoqueFinal: 0, pedidosProduto: 2 },
])("reprova contagens inconsistentes: %j", (result) => {
  expect(validarRodada(result, 5).length).toBeGreaterThan(0);
});

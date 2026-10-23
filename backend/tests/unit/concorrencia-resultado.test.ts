import { expect, it } from "vitest";
import {
  lerOpcoes,
  validarRodada,
} from "../../scripts/concorrencia-checkout.js";

const rodadaValida = {
  sucessos: 1,
  conflitos409: 4,
  estoqueFinal: 0,
  pedidosProduto: 1,
  pagamentosCriados: 1,
  respostasInesperadas: 0,
};

it("aceita uma unica venda do ultimo item para cinco compradores", () => {
  expect(validarRodada(rodadaValida, 5)).toEqual([]);
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
  expect(
    validarRodada({ ...rodadaValida, ...result }, 5).length,
  ).toBeGreaterThan(0);
});

it.each([0, 2, -1])("reprova %i pagamentos do produto", (pagamentosCriados) => {
  expect(validarRodada({ ...rodadaValida, pagamentosCriados }, 5)).not.toEqual(
    [],
  );
});

it("reprova respostas inesperadas mesmo com as demais contagens corretas", () => {
  expect(
    validarRodada({ ...rodadaValida, respostasInesperadas: 1 }, 5),
  ).not.toEqual([]);
});

it("aceita caminho JSON preservando o padrao de cinquenta clientes", () => {
  expect(lerOpcoes(["--saida", "rodadas.json"], {})).toEqual({
    clientes: 50,
    port: 3910,
    saida: "rodadas.json",
  });
});

it.each([["--saida"], ["--saida", ""], ["--saida", "   "]])(
  "recusa saida ausente ou vazia: %j",
  (...args) => {
    expect(() => lerOpcoes(args, {})).toThrow();
  },
);

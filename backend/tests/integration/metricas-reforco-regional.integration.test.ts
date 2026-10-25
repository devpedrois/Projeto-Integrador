import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarBancoAuth } from "../helpers/auth-database.js";
import {
  medirReforcoRegional,
  formatarTabelaRegional,
} from "../../scripts/lib/recomendacao-benchmark.js";

let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

beforeAll(async () => {
  banco = await criarBancoAuth();
  const artesaos: string[] = [];
  for (const regiaoId of [
    "regiao-alto-moura-caruaru",
    "regiao-pilar-recife",
    null,
  ]) {
    const artesao = await banco.prisma.usuario.create({
      data: {
        nome: "Artesao sintetico IA.3",
        email: `${randomUUID()}@teste.origem`,
        senhaHash: "sintetico",
        papel: "artesao",
        perfilArtesao: { create: { regiaoId } },
      },
    });
    artesaos.push(artesao.id);
  }
  const categorias = await Promise.all(
    ["Principal", "Singleton", "Sem regiao", "Oculta"].map((nome) =>
      banco.prisma.categoria.create({ data: { nome: `${nome} IA.3` } }),
    ),
  );
  for (let i = 1; i <= 14; i++) {
    await banco.prisma.produto.create({
      data: {
        id: uuid(i),
        nome: `Produto IA.3 ${i}`,
        descricao: "Sintetico",
        preco: 10,
        quantidadeEstoque: 1,
        artesaoId: artesaos[i === 14 ? 2 : i <= 6 || i === 13 ? 0 : 1] ?? "",
        categoriaId: categorias[i === 13 ? 1 : i === 14 ? 2 : 0]?.id ?? "",
        tecnicaId: "tecnica-modelagem-argila",
      },
    });
  }
  await banco.prisma.produto.create({
    data: {
      id: uuid(15),
      nome: "Oculto",
      descricao: "Sintetico",
      preco: 10,
      quantidadeEstoque: 2,
      desativadoPorAdmin: true,
      artesaoId: artesaos[0] ?? "",
      categoriaId: categorias[3]?.id ?? "",
      tecnicaId: "tecnica-modelagem-argila",
    },
  });
}, 30_000);
afterAll(async () => {
  await banco?.fechar();
});

describe("IA.3 comparacao regional com PostgreSQL real", () => {
  it("conta produtos, fallback, cobertura, categoria e regiao nos dois modos", async () => {
    const resultados = await medirReforcoRegional(banco.prisma, "ambos");
    expect(resultados.map((r) => r.modo)).toEqual(["on", "off"]);
    const [on, off] = resultados;
    if (!on || !off) throw new Error("Comparacao incompleta");
    for (const r of resultados) {
      expect(r.produtos).toBe(15);
      expect(r.produtosElegiveis).toBe(14);
      expect(r.contextos).toBe(14);
      expect(r.contextosSemRegiao).toBe(1);
      expect(r.totalRecomendacoes).toBe(112);
      expect(r.acertoCategoria).toEqual({
        numerador: 96,
        denominador: 112,
        percentual: 600 / 7,
      });
      expect(r.taxaFallback).toEqual({
        numerador: 2,
        denominador: 14,
        percentual: 100 / 7,
      });
    }
    expect(on.coberturaCatalogo.numerador).toBe(12);
    expect(off.coberturaCatalogo.numerador).toBe(9);
    expect(on.mesmaRegiao).toEqual({
      numerador: 66,
      denominador: 112,
      percentual: 825 / 14,
    });
    expect(off.mesmaRegiao).toEqual({
      numerador: 48,
      denominador: 112,
      percentual: 300 / 7,
    });
    const tabela = formatarTabelaRegional(resultados);
    const linhas = tabela
      .split("\n")
      .slice(2)
      .map((linha) =>
        linha
          .split("|")
          .slice(1, -1)
          .map((celula) => celula.trim()),
      );
    expect(linhas).toEqual([
      [
        "on",
        "15",
        "14",
        "112",
        String(600 / 7),
        "100",
        String(100 / 7),
        String(600 / 7),
        String(825 / 14),
      ],
      [
        "off",
        "15",
        "14",
        "112",
        String(450 / 7),
        "100",
        String(100 / 7),
        String(600 / 7),
        String(300 / 7),
      ],
    ]);
    expect(JSON.stringify(resultados)).not.toMatch(
      /senhaHash|postgresql:|origem_sessao|@teste.origem/,
    );
  }, 30_000);
  it.each(["on", "off"] as const)(
    "executa somente o modo %s solicitado",
    async (modo) => {
      expect(
        (await medirReforcoRegional(banco.prisma, modo)).map((r) => r.modo),
      ).toEqual([modo]);
    },
    30_000,
  );
  it("retorna zeros em base vazia sem NaN ou Infinity", async () => {
    const vazio = await criarBancoAuth();
    try {
      for (const r of await medirReforcoRegional(vazio.prisma, "ambos")) {
        expect(r.produtos).toBe(0);
        expect(r.totalRecomendacoes).toBe(0);
        for (const m of [
          r.coberturaCatalogo,
          r.coberturaContextos,
          r.taxaFallback,
          r.acertoCategoria,
          r.mesmaRegiao,
        ])
          expect(m).toEqual({ numerador: 0, denominador: 0, percentual: 0 });
      }
    } finally {
      await vazio.fechar();
    }
  }, 30_000);
});

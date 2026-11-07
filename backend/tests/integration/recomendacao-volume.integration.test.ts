import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarBancoAuth } from "../helpers/auth-database.js";
import { medirBaseRecomendacao } from "../../scripts/lib/recomendacao-benchmark.js";

let banco: Awaited<ReturnType<typeof criarBancoAuth>>;

beforeAll(async () => {
  banco = await criarBancoAuth();
  await banco.prisma.tecnica.create({
    data: { id: "ia04-tecnica", nome: "IA04 tecnica" },
  });
  const artesao = await banco.prisma.usuario.create({
    data: {
      nome: "Artesao IA04",
      email: `${randomUUID()}@teste.origem`,
      senhaHash: "hash-sintetico",
      papel: "artesao",
    },
  });
  const comHistorico = await banco.prisma.usuario.create({
    data: {
      nome: "Comprador IA04",
      email: `${randomUUID()}@teste.origem`,
      senhaHash: "hash-sintetico",
    },
  });
  await banco.prisma.usuario.create({
    data: {
      nome: "Sem historico IA04",
      email: `${randomUUID()}@teste.origem`,
      senhaHash: "hash-sintetico",
    },
  });
  const ceramica = await banco.prisma.categoria.create({
    data: { nome: "Ceramica IA04" },
  });
  const tecido = await banco.prisma.categoria.create({
    data: { nome: "Tecido IA04" },
  });
  const produtos = [];
  for (const categoriaId of [ceramica.id, ceramica.id, tecido.id]) {
    produtos.push(
      await banco.prisma.produto.create({
        data: {
          nome: "Produto IA04",
          descricao: "Sintetico",
          preco: 10,
          categoriaId,
          tecnicaId: "ia04-tecnica",
          artesaoId: artesao.id,
          quantidadeEstoque: 5,
        },
      }),
    );
  }
  const oculta = await banco.prisma.categoria.create({
    data: { nome: "Oculta IA04" },
  });
  await banco.prisma.produto.create({
    data: {
      nome: "Oculto IA04",
      descricao: "Sintetico",
      preco: 10,
      categoriaId: oculta.id,
      tecnicaId: "ia04-tecnica",
      artesaoId: artesao.id,
      quantidadeEstoque: 5,
      desativadoPorAdmin: true,
    },
  });
  const comprado = produtos[0];
  if (!comprado) throw new Error("Fixture sem produto comprado");
  await banco.prisma.pedido.create({
    data: {
      compradorId: comHistorico.id,
      numero: `IA04-${randomUUID()}`,
      status: "confirmado",
      itens: { create: { produtoId: comprado.id, quantidade: 1 } },
    },
  });
}, 30_000);

afterAll(async () => {
  if (banco) await banco.fechar();
});

describe("IA-04: medicao por HTTP e PostgreSQL reais", () => {
  it("mede ambas as estrategias, distingue MISS/HIT e bypass pessoal", async () => {
    const resultado = await medirBaseRecomendacao(
      banco.prisma,
      "demo",
      "seed-isolado",
      2,
    );
    expect(resultado.tamanho).toMatchObject({
      produtos: 4,
      produtosElegiveis: 3,
      compradoresAtivos: 2,
      pedidos: 1,
      categoriasElegiveis: 2,
    });
    const [categoria, historico] = resultado.estrategias;
    if (!categoria || !historico) throw new Error("Estrategias nao medidas");
    expect(categoria.estrategia).toBe("categoria");
    expect(categoria.contextos).toBe(3);
    expect(categoria.coberturaCatalogo.numerador).toBe(3);
    expect(categoria.coberturaCatalogo.denominador).toBe(3);
    expect(categoria.coberturaCatalogo.percentual).toBe(100);
    expect(categoria.coberturaContextos.percentual).toBe(100);
    expect(categoria.taxaFallback.percentual).toBe(100);
    expect(categoria.diversidadeCategorias.mediaPorResposta).toBeCloseTo(5 / 3);
    expect(categoria.frio.cache).toEqual({ hit: 0, miss: 6, bypass: 0 });
    expect(categoria.quente.cache).toEqual({ hit: 0, miss: 6, bypass: 0 });
    expect(historico.estrategia).toBe("historico");
    expect(historico.contextos).toBe(2);
    expect(historico.coberturaCatalogo.percentual).toBe(100);
    expect(historico.taxaFallback.percentual).toBe(100);
    expect(historico.diversidadeCategorias.mediaPorResposta).toBe(2);
    expect(historico.frio.cache).toEqual({ hit: 0, miss: 0, bypass: 4 });
    expect(historico.quente.cache).toEqual({ hit: 0, miss: 0, bypass: 4 });
    for (const metrica of resultado.estrategias) {
      expect(metrica.frio.mediaMs).toBeGreaterThan(0);
      expect(metrica.frio.p95Ms).toBeGreaterThanOrEqual(metrica.frio.mediaMs);
      expect(metrica.quente.mediaMs).toBeGreaterThan(0);
    }
    expect(JSON.stringify(resultado)).not.toMatch(
      /senhaHash|postgresql:|origem_sessao|@teste.origem/,
    );
    expect(await banco.prisma.pedido.count()).toBe(1);
  }, 30_000);
});

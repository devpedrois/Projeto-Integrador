import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarBancoAuth } from "../helpers/auth-database.js";
import { medirBaseRecomendacao } from "../../scripts/lib/recomendacao-benchmark.js";
import {
  parseMetricsOptions,
  runMetrics,
} from "../../scripts/metricas-recomendacao.js";

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
  it("CLI seleciona schemas existentes sem modificar dados e salva tabela/JSON", async () => {
    const volume = await criarBancoAuth();
    const directory = await mkdtemp(join(tmpdir(), "ia04-metricas-"));
    try {
      const artesao = await volume.prisma.usuario.create({
        data: {
          nome: "Artesao volume IA04",
          email: `${randomUUID()}@teste.origem`,
          senhaHash: "hash-sintetico",
          papel: "artesao",
        },
      });
      await volume.prisma.usuario.create({
        data: {
          nome: "Comprador volume IA04",
          email: `${randomUUID()}@teste.origem`,
          senhaHash: "hash-sintetico",
          papel: "comprador",
        },
      });
      const categoria = await volume.prisma.categoria.create({
        data: { nome: "Volume IA04" },
      });
      await volume.prisma.produto.create({
        data: {
          nome: "Volume IA04",
          descricao: "Sintetico",
          preco: 10,
          quantidadeEstoque: 5,
          artesaoId: artesao.id,
          categoriaId: categoria.id,
          tecnicaId: "tecnica-modelagem-argila",
        },
      });
      const [demoSchema] = await banco.prisma.$queryRaw<
        { schema: string }[]
      >`SELECT current_schema() AS schema`;
      const [volumeSchema] = await volume.prisma.$queryRaw<
        { schema: string }[]
      >`SELECT current_schema() AS schema`;
      if (!demoSchema || !volumeSchema || !process.env.DIRECT_URL)
        throw new Error("Fixture sem conexao ou schema");
      const output = join(directory, "resultado.json");
      const options = parseMetricsOptions([
        "--schema-demo",
        demoSchema.schema,
        "--schema-volume",
        volumeSchema.schema,
        "--output",
        output,
      ]);
      const result = await runMetrics(options, {
        DATABASE_URL: process.env.DIRECT_URL,
        DATABASE_URL_VOLUME: process.env.DIRECT_URL,
      });
      expect(
        result.bases.map((base) => [
          base.base,
          base.origem,
          base.tamanho.produtos,
        ]),
      ).toEqual([
        ["demo", "branch-configurada", 4],
        ["volume", "branch-configurada", 1],
      ]);
      expect(JSON.parse(await readFile(output, "utf8"))).toEqual(result);
      expect(await banco.prisma.pedido.count()).toBe(1);
      expect(await volume.prisma.produto.count()).toBe(1);
    } finally {
      await volume.fechar();
      await rm(directory, { recursive: true, force: true });
    }
  }, 30_000);

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
    expect(categoria.coberturaCatalogo.numerador).toBe(2);
    expect(categoria.coberturaCatalogo.denominador).toBe(3);
    expect(categoria.coberturaCatalogo.percentual).toBeCloseTo(200 / 3);
    expect(categoria.coberturaContextos.percentual).toBe(100);
    expect(categoria.taxaFallback.percentual).toBeCloseTo(100 / 3);
    expect(categoria.diversidadeCategorias.mediaPorResposta).toBe(1);
    expect(categoria.frio.cache).toEqual({ hit: 0, miss: 6, bypass: 0 });
    expect(categoria.quente.cache).toEqual({ hit: 6, miss: 0, bypass: 0 });
    expect(historico.estrategia).toBe("historico");
    expect(historico.contextos).toBe(2);
    expect(historico.coberturaCatalogo.percentual).toBe(100);
    expect(historico.taxaFallback.percentual).toBe(50);
    expect(historico.diversidadeCategorias.mediaPorResposta).toBe(1.5);
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

import { randomUUID } from "node:crypto";
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "../../src/database/prisma/client.js";
import { PrismaRecomendacaoRepository } from "../../src/repositories/recomendacao.repository.js";
import { CategoriaRecomendacaoStrategy } from "../../src/integrations/recommendation/categoria-recomendacao.strategy.js";
import { databasePool } from "../helpers/database.js";
import { criarCategoria, criarUsuarioArtesao, criarUsuarioComprador } from "../helpers/dominio-fixtures.js";
import fixture from "../../../fixtures/recomendacao-produto.fixture.json" with { type: "json" };

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error("DATABASE_URL is required for integration tests");
}

const prisma = createPrismaClient(databaseUrl);
const repository = new PrismaRecomendacaoRepository(prisma);
const strategy = new CategoriaRecomendacaoStrategy(repository);

interface FixtureProduto {
  id: string;
  categoriaId: string;
  quantidadeEstoque: number;
  quantidadeVendida: number;
  notaMedia: number;
  ativo: boolean;
}

const NOTAS_POR_MEDIA: Record<string, number[]> = {
  "3": [3],
  "4": [4],
  "4.8": [4, 5, 5, 5, 5],
  "5": [5],
};

function notasParaMedia(alvo: number): number[] {
  const notas = NOTAS_POR_MEDIA[String(alvo)];
  if (notas === undefined) {
    throw new Error(`sem receita de notas cadastrada para a media ${alvo}`);
  }
  return notas;
}

const produtoIdReal = new Map<string, string>();
const categoriaIdReal = new Map<string, string>();
const idsUsuarioCriados: string[] = [];
const idsCategoriaCriados: string[] = [];
const idsProdutoCriados: string[] = [];
const idsPedidoCriados: string[] = [];

let artesaoId: string;
let compradores: string[];

async function criarCompradores(quantidade: number): Promise<string[]> {
  const ids: string[] = [];
  for (let indice = 0; indice < quantidade; indice += 1) {
    const id = await criarUsuarioComprador(databasePool);
    ids.push(id);
  }
  return ids;
}

async function semearProdutoFixture(produtoFixture: FixtureProduto): Promise<string> {
  let categoriaReal = categoriaIdReal.get(produtoFixture.categoriaId);
  if (categoriaReal === undefined) {
    categoriaReal = await criarCategoria(databasePool);
    categoriaIdReal.set(produtoFixture.categoriaId, categoriaReal);
    idsCategoriaCriados.push(categoriaReal);
  }

  const produtoId = randomUUID();
  await databasePool.query(
    'INSERT INTO "Produto" ("id", "nome", "artesaoId", "categoriaId", "quantidadeEstoque", "ativo") VALUES ($1, $2, $3, $4, $5, $6)',
    [
      produtoId,
      `Fixture ${produtoFixture.id}`,
      artesaoId,
      categoriaReal,
      produtoFixture.quantidadeEstoque,
      produtoFixture.ativo,
    ],
  );
  idsProdutoCriados.push(produtoId);
  produtoIdReal.set(produtoFixture.id, produtoId);

  if (produtoFixture.quantidadeVendida > 0) {
    const compradorPedido = compradores[0] as string;
    const pedidoId = randomUUID();
    await databasePool.query(
      'INSERT INTO "Pedido" ("id", "compradorRef", "compradorId") VALUES ($1, $2, $3)',
      [pedidoId, `recomendacao-fixture-${produtoId}`, compradorPedido],
    );
    idsPedidoCriados.push(pedidoId);
    await databasePool.query(
      'INSERT INTO "ItemPedido" ("id", "pedidoId", "produtoId", "quantidade") VALUES ($1, $2, $3, $4)',
      [randomUUID(), pedidoId, produtoId, produtoFixture.quantidadeVendida],
    );
  }

  const notas = notasParaMedia(produtoFixture.notaMedia);
  for (const [indice, nota] of notas.entries()) {
    const compradorAvaliacao = compradores[indice + 1];
    if (compradorAvaliacao === undefined) {
      throw new Error("pool de compradores insuficiente para avaliacoes da fixture");
    }
    await databasePool.query(
      'INSERT INTO "Avaliacao" ("id", "compradorId", "produtoId", "nota") VALUES ($1, $2, $3, $4)',
      [randomUUID(), compradorAvaliacao, produtoId, nota],
    );
  }

  return produtoId;
}

beforeAll(async () => {
  artesaoId = await criarUsuarioArtesao(databasePool);
  idsUsuarioCriados.push(artesaoId);
  compradores = await criarCompradores(6);
  idsUsuarioCriados.push(...compradores);

  for (const produtoFixture of fixture.produtos as FixtureProduto[]) {
    await semearProdutoFixture(produtoFixture);
  }
});

afterAll(async () => {
  await databasePool.query('DELETE FROM "Avaliacao" WHERE "produtoId" = ANY($1)', [
    idsProdutoCriados,
  ]);
  await databasePool.query('DELETE FROM "ItemPedido" WHERE "produtoId" = ANY($1)', [
    idsProdutoCriados,
  ]);
  await databasePool.query('DELETE FROM "Pedido" WHERE "id" = ANY($1)', [idsPedidoCriados]);
  await databasePool.query('DELETE FROM "Produto" WHERE "id" = ANY($1)', [idsProdutoCriados]);
  await databasePool.query('DELETE FROM "Categoria" WHERE "id" = ANY($1)', [
    idsCategoriaCriados,
  ]);
  await databasePool.query('DELETE FROM "Usuario" WHERE "id" = ANY($1)', [idsUsuarioCriados]);
  await prisma.$disconnect();
  await databasePool.end();
});

describe("CategoriaRecomendacaoStrategy - paridade com a fixture contratual (T04.1)", () => {
  it("reproduz o mesmo ranking da fixture usada pelo FakeRecommendationAdapter", async () => {
    const produtoContextoId = produtoIdReal.get(fixture.contexto.produtoId);
    if (produtoContextoId === undefined) throw new Error("produto de contexto nao semeado");

    const resultado = await strategy.obter({ produtoId: produtoContextoId });

    const idsEsperados = (fixture.resultadoEsperado.produtoIds as string[]).map((idFixture) => {
      const idReal = produtoIdReal.get(idFixture);
      if (idReal === undefined) throw new Error(`produto fixture sem mapeamento: ${idFixture}`);
      return idReal;
    });
    // A fixture usa "p03" antes de "p05" como convencao de leitura para o
    // empate (mesma venda, mesma nota); o desempate real e por UUID
    // crescente, entao a ordem entre os dois ids gerados e recalculada aqui.
    const indiceP03 = (fixture.resultadoEsperado.produtoIds as string[]).indexOf(
      "produto-fixture-p03",
    );
    const indiceP05 = (fixture.resultadoEsperado.produtoIds as string[]).indexOf(
      "produto-fixture-p05",
    );
    const idP03 = idsEsperados[indiceP03] as string;
    const idP05 = idsEsperados[indiceP05] as string;
    const empateOrdenado = [idP03, idP05].sort();
    const menorEmpate = empateOrdenado[0] as string;
    const maiorEmpate = empateOrdenado[1] as string;
    idsEsperados[Math.min(indiceP03, indiceP05)] = menorEmpate;
    idsEsperados[Math.max(indiceP03, indiceP05)] = maiorEmpate;

    expect(resultado.estrategia).toBe(fixture.resultadoEsperado.estrategia);
    expect(resultado.itens.map((item) => item.id)).toEqual(idsEsperados);
  });

  it("nunca retorna mais itens que o limite documentado", async () => {
    const produtoContextoId = produtoIdReal.get(fixture.contexto.produtoId) as string;

    const resultado = await strategy.obter({ produtoId: produtoContextoId });

    expect(resultado.itens.length).toBeLessThanOrEqual(fixture.limiteItens);
  });

  it("nunca inclui o produto de contexto no resultado", async () => {
    const produtoContextoId = produtoIdReal.get(fixture.contexto.produtoId) as string;

    const resultado = await strategy.obter({ produtoId: produtoContextoId });

    expect(resultado.itens.some((item) => item.id === produtoContextoId)).toBe(false);
  });

  it("nunca inclui produto de outra categoria, inativo ou sem estoque", async () => {
    const produtoContextoId = produtoIdReal.get(fixture.contexto.produtoId) as string;
    const outraCategoriaId = produtoIdReal.get("produto-fixture-outra-categoria") as string;
    const inativoId = produtoIdReal.get("produto-fixture-inativo") as string;
    const semEstoqueId = produtoIdReal.get("produto-fixture-sem-estoque") as string;

    const resultado = await strategy.obter({ produtoId: produtoContextoId });
    const idsRetornados = resultado.itens.map((item) => item.id);

    expect(idsRetornados).not.toContain(outraCategoriaId);
    expect(idsRetornados).not.toContain(inativoId);
    expect(idsRetornados).not.toContain(semEstoqueId);
  });
});

describe("CategoriaRecomendacaoStrategy - desempate deterministico por UUID", () => {
  it("ordena vendas iguais e notas iguais pelo UUID crescente", async () => {
    const categoriaId = await criarCategoria(databasePool);
    idsCategoriaCriados.push(categoriaId);
    const contextoId = randomUUID();
    await databasePool.query(
      'INSERT INTO "Produto" ("id", "nome", "artesaoId", "categoriaId", "quantidadeEstoque") VALUES ($1, $2, $3, $4, $5)',
      [contextoId, "Contexto desempate", artesaoId, categoriaId, 5],
    );
    idsProdutoCriados.push(contextoId);

    const candidatoA = randomUUID();
    const candidatoB = randomUUID();
    const [menorId, maiorId] = [candidatoA, candidatoB].sort();

    for (const id of [candidatoA, candidatoB]) {
      await databasePool.query(
        'INSERT INTO "Produto" ("id", "nome", "artesaoId", "categoriaId", "quantidadeEstoque") VALUES ($1, $2, $3, $4, $5)',
        [id, "Candidato empatado", artesaoId, categoriaId, 5],
      );
      idsProdutoCriados.push(id);
      const pedidoId = randomUUID();
      await databasePool.query(
        'INSERT INTO "Pedido" ("id", "compradorRef", "compradorId") VALUES ($1, $2, $3)',
        [pedidoId, `desempate-${id}`, compradores[0]],
      );
      idsPedidoCriados.push(pedidoId);
      await databasePool.query(
        'INSERT INTO "ItemPedido" ("id", "pedidoId", "produtoId", "quantidade") VALUES ($1, $2, $3, $4)',
        [randomUUID(), pedidoId, id, 10],
      );
      await databasePool.query(
        'INSERT INTO "Avaliacao" ("id", "compradorId", "produtoId", "nota") VALUES ($1, $2, $3, $4)',
        [randomUUID(), compradores[1], id, 4],
      );
    }

    const resultado = await strategy.obter({ produtoId: contextoId });

    expect(resultado.itens.map((item) => item.id)).toEqual([menorId, maiorId]);
  });
});

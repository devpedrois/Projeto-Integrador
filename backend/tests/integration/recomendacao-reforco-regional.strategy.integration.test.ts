import { randomUUID } from "node:crypto";
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "../../src/database/prisma/client.js";
import { PrismaRecomendacaoRepository } from "../../src/repositories/recomendacao.repository.js";
import { CategoriaRecomendacaoStrategy } from "../../src/integrations/recommendation/categoria-recomendacao.strategy.js";
import { databasePool } from "../helpers/database.js";
import {
  criarCategoria,
  criarUsuarioArtesaoComRegiao,
  criarUsuarioComprador,
} from "../helpers/dominio-fixtures.js";

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error("DATABASE_URL is required for integration tests");
}

const prisma = createPrismaClient(databaseUrl);
const repository = new PrismaRecomendacaoRepository(prisma);
const strategySemReforco = new CategoriaRecomendacaoStrategy(repository);
const strategyComReforco = new CategoriaRecomendacaoStrategy(repository, true);

const REGIAO_CONTEXTO = "Recife - Comunidade do Pilar";
const REGIAO_OUTRA = "Caruaru - Alto do Moura";

const idsUsuarioCriados: string[] = [];
const idsCategoriaCriados: string[] = [];
const idsProdutoCriados: string[] = [];
const idsPedidoCriados: string[] = [];

let artesaoContextoId: string;
let artesaoMesmaRegiaoId: string;
let artesaoOutraRegiaoId: string;
let compradores: string[];
let categoriaId: string;
let produtoContextoId: string;

let mesmaRegiaoAltaId: string;
let mesmaRegiaoBaixaId: string;
let outraRegiaoAltaId: string;
let outraRegiaoBaixaId: string;

async function criarProduto(params: {
  artesaoId: string;
  categoriaId: string;
  vendas: number;
  nota?: number;
}): Promise<string> {
  const id = randomUUID();
  await databasePool.query(
    'INSERT INTO "Produto" ("id", "nome", "artesaoId", "categoriaId", "quantidadeEstoque") VALUES ($1, $2, $3, $4, $5)',
    [id, `Reforco regional ${id}`, params.artesaoId, params.categoriaId, 10],
  );
  idsProdutoCriados.push(id);

  if (params.vendas > 0) {
    const pedidoId = randomUUID();
    await databasePool.query(
      'INSERT INTO "Pedido" ("id", "compradorRef", "compradorId") VALUES ($1, $2, $3)',
      [pedidoId, `reforco-regional-${id}`, compradores[0]],
    );
    idsPedidoCriados.push(pedidoId);
    await databasePool.query(
      'INSERT INTO "ItemPedido" ("id", "pedidoId", "produtoId", "quantidade") VALUES ($1, $2, $3, $4)',
      [randomUUID(), pedidoId, id, params.vendas],
    );
  }

  if (params.nota !== undefined) {
    await databasePool.query(
      'INSERT INTO "Avaliacao" ("id", "compradorId", "produtoId", "nota") VALUES ($1, $2, $3, $4)',
      [randomUUID(), compradores[1], id, params.nota],
    );
  }

  return id;
}

beforeAll(async () => {
  artesaoContextoId = await criarUsuarioArtesaoComRegiao(databasePool, REGIAO_CONTEXTO);
  artesaoMesmaRegiaoId = await criarUsuarioArtesaoComRegiao(databasePool, REGIAO_CONTEXTO);
  artesaoOutraRegiaoId = await criarUsuarioArtesaoComRegiao(databasePool, REGIAO_OUTRA);
  idsUsuarioCriados.push(artesaoContextoId, artesaoMesmaRegiaoId, artesaoOutraRegiaoId);

  compradores = [await criarUsuarioComprador(databasePool), await criarUsuarioComprador(databasePool)];
  idsUsuarioCriados.push(...compradores);

  categoriaId = await criarCategoria(databasePool);
  idsCategoriaCriados.push(categoriaId);

  produtoContextoId = await criarProduto({
    artesaoId: artesaoContextoId,
    categoriaId,
    vendas: 0,
  });

  // Vendas deliberadamente invertidas entre regioes: sem reforco, a regiao
  // "outra" vence por vendas maiores; com reforco, a mesma regiao do
  // contexto vence antes de olhar vendas.
  outraRegiaoAltaId = await criarProduto({
    artesaoId: artesaoOutraRegiaoId,
    categoriaId,
    vendas: 100,
    nota: 5,
  });
  outraRegiaoBaixaId = await criarProduto({
    artesaoId: artesaoOutraRegiaoId,
    categoriaId,
    vendas: 50,
    nota: 5,
  });
  mesmaRegiaoAltaId = await criarProduto({
    artesaoId: artesaoMesmaRegiaoId,
    categoriaId,
    vendas: 10,
    nota: 4,
  });
  mesmaRegiaoBaixaId = await criarProduto({
    artesaoId: artesaoMesmaRegiaoId,
    categoriaId,
    vendas: 5,
    nota: 4,
  });
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
  await databasePool.query('DELETE FROM "Categoria" WHERE "id" = ANY($1)', [idsCategoriaCriados]);
  await databasePool.query('DELETE FROM "PerfilArtesao" WHERE "usuarioId" = ANY($1)', [
    idsUsuarioCriados,
  ]);
  await databasePool.query('DELETE FROM "Usuario" WHERE "id" = ANY($1)', [idsUsuarioCriados]);
  await prisma.$disconnect();
  await databasePool.end();
});

describe("CategoriaRecomendacaoStrategy - reforco regional (PI4-20.4)", () => {
  it("sem reforco, preserva a ordenacao baseline por vendas, ignorando regiao", async () => {
    const resultado = await strategySemReforco.obter({ produtoId: produtoContextoId });

    expect(resultado.itens.map((item) => item.id)).toEqual([
      outraRegiaoAltaId,
      outraRegiaoBaixaId,
      mesmaRegiaoAltaId,
      mesmaRegiaoBaixaId,
    ]);
  });

  it("com reforco, prioriza candidatos da mesma regiao do contexto antes de olhar vendas", async () => {
    const resultado = await strategyComReforco.obter({ produtoId: produtoContextoId });

    expect(resultado.itens.map((item) => item.id)).toEqual([
      mesmaRegiaoAltaId,
      mesmaRegiaoBaixaId,
      outraRegiaoAltaId,
      outraRegiaoBaixaId,
    ]);
  });

  it("com reforco, desempate dentro de cada grupo regional continua deterministico por UUID", async () => {
    const categoriaEmpateId = await criarCategoria(databasePool);
    idsCategoriaCriados.push(categoriaEmpateId);
    const produtoContextoEmpateId = await criarProduto({
      artesaoId: artesaoContextoId,
      categoriaId: categoriaEmpateId,
      vendas: 0,
    });

    const candidatoA = await criarProduto({
      artesaoId: artesaoMesmaRegiaoId,
      categoriaId: categoriaEmpateId,
      vendas: 7,
      nota: 4,
    });
    const candidatoB = await criarProduto({
      artesaoId: artesaoMesmaRegiaoId,
      categoriaId: categoriaEmpateId,
      vendas: 7,
      nota: 4,
    });
    const [menorId, maiorId] = [candidatoA, candidatoB].sort();

    const resultado = await strategyComReforco.obter({ produtoId: produtoContextoEmpateId });

    expect(resultado.itens.map((item) => item.id)).toEqual([menorId, maiorId]);
  });

  it("com reforco, o limite de oito itens permanece respeitado", async () => {
    const resultado = await strategyComReforco.obter({ produtoId: produtoContextoId });

    expect(resultado.itens.length).toBeLessThanOrEqual(8);
  });
});

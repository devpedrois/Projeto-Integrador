import { randomUUID } from "node:crypto";
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "../../src/database/prisma/client.js";
import { PrismaRecomendacaoRepository } from "../../src/repositories/recomendacao.repository.js";
import { CategoriaRecomendacaoStrategy } from "../../src/integrations/recommendation/categoria-recomendacao.strategy.js";
import { databasePool } from "../helpers/database.js";
import { criarCategoria, criarUsuarioArtesao, criarUsuarioComprador } from "../helpers/dominio-fixtures.js";

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error("DATABASE_URL is required for integration tests");
}

const prisma = createPrismaClient(databaseUrl);
const repository = new PrismaRecomendacaoRepository(prisma);
const strategy = new CategoriaRecomendacaoStrategy(repository);

const ESTRATEGIA_FALLBACK = "fallback-geral";

interface ProdutoUniversoSpec {
  chave: string;
  vendas: number;
  nota?: number;
}

// Vendas em patamares muito acima do que qualquer outro teste de integracao
// gera (pedidos reais de outras suites usam quantidades pequenas), garantindo
// ordenacao estavel mesmo com o banco de desenvolvimento compartilhado.
const UNIVERSO: ProdutoUniversoSpec[] = [
  { chave: "a", vendas: 90000, nota: 5 },
  { chave: "b", vendas: 90000, nota: 5 },
  { chave: "c", vendas: 70000, nota: 4 },
  { chave: "d", vendas: 70000 },
  { chave: "e", vendas: 50000, nota: 3 },
  { chave: "h", vendas: 30000, nota: 1 },
  { chave: "i", vendas: 10000, nota: 1 },
  { chave: "j", vendas: 10000, nota: 1 },
  { chave: "f", vendas: 0, nota: 2 },
  { chave: "g", vendas: 0 },
];

const idsUsuarioCriados: string[] = [];
const idsCategoriaCriados: string[] = [];
const idsProdutoCriados: string[] = [];
const idsPedidoCriados: string[] = [];

let artesaoId: string;
let compradores: string[];
let categoriaUniversoId: string;
const produtoIdPorChave = new Map<string, string>();
let inativoId: string;
let semEstoqueId: string;
let categoriaIsoladaId: string;
let produtoIsoladoId: string;

async function criarProdutoComVendasENota(params: {
  categoriaId: string;
  vendas: number;
  nota?: number;
  ativo?: boolean;
  quantidadeEstoque?: number;
}): Promise<string> {
  const id = randomUUID();
  await databasePool.query(
    'INSERT INTO "Produto" ("id", "nome", "artesaoId", "categoriaId", "quantidadeEstoque", "ativo") VALUES ($1, $2, $3, $4, $5, $6)',
    [
      id,
      `Fallback ${id}`,
      artesaoId,
      params.categoriaId,
      params.quantidadeEstoque ?? 10,
      params.ativo ?? true,
    ],
  );
  idsProdutoCriados.push(id);

  if (params.vendas > 0) {
    const pedidoId = randomUUID();
    await databasePool.query(
      'INSERT INTO "Pedido" ("id", "compradorRef", "compradorId") VALUES ($1, $2, $3)',
      [pedidoId, `fallback-fixture-${id}`, compradores[0]],
    );
    idsPedidoCriados.push(pedidoId);
    await databasePool.query(
      'INSERT INTO "ItemPedido" ("id", "pedidoId", "produtoId", "quantidade") VALUES ($1, $2, $3, $4)',
      [randomUUID(), pedidoId, id, params.vendas],
    );
  }

  if (params.nota !== undefined) {
    const compradorAvaliacao = compradores[1];
    await databasePool.query(
      'INSERT INTO "Avaliacao" ("id", "compradorId", "produtoId", "nota") VALUES ($1, $2, $3, $4)',
      [randomUUID(), compradorAvaliacao, id, params.nota],
    );
  }

  return id;
}

function ordemEsperadaUniverso(): string[] {
  const chavesEmOrdem = ["a", "b", "c", "d", "e", "h", "i", "j"];
  const idsBrutos = chavesEmOrdem.map((chave) => produtoIdPorChave.get(chave) as string);
  const parA = [idsBrutos[0], idsBrutos[1]].sort();
  const parI = [idsBrutos[6], idsBrutos[7]].sort();
  return [
    parA[0] as string,
    parA[1] as string,
    idsBrutos[2] as string,
    idsBrutos[3] as string,
    idsBrutos[4] as string,
    idsBrutos[5] as string,
    parI[0] as string,
    parI[1] as string,
  ];
}

beforeAll(async () => {
  artesaoId = await criarUsuarioArtesao(databasePool);
  idsUsuarioCriados.push(artesaoId);
  compradores = [];
  for (let indice = 0; indice < 2; indice += 1) {
    const id = await criarUsuarioComprador(databasePool);
    compradores.push(id);
    idsUsuarioCriados.push(id);
  }

  categoriaUniversoId = await criarCategoria(databasePool);
  idsCategoriaCriados.push(categoriaUniversoId);

  for (const especificacao of UNIVERSO) {
    const id = await criarProdutoComVendasENota(
      especificacao.nota === undefined
        ? { categoriaId: categoriaUniversoId, vendas: especificacao.vendas }
        : { categoriaId: categoriaUniversoId, vendas: especificacao.vendas, nota: especificacao.nota },
    );
    produtoIdPorChave.set(especificacao.chave, id);
  }

  inativoId = await criarProdutoComVendasENota({
    categoriaId: categoriaUniversoId,
    vendas: 999,
    nota: 5,
    ativo: false,
  });
  semEstoqueId = await criarProdutoComVendasENota({
    categoriaId: categoriaUniversoId,
    vendas: 999,
    nota: 5,
    quantidadeEstoque: 0,
  });

  categoriaIsoladaId = await criarCategoria(databasePool);
  idsCategoriaCriados.push(categoriaIsoladaId);
  produtoIsoladoId = await criarProdutoComVendasENota({
    categoriaId: categoriaIsoladaId,
    vendas: 0,
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
  await databasePool.query('DELETE FROM "Categoria" WHERE "id" = ANY($1)', [
    idsCategoriaCriados,
  ]);
  await databasePool.query('DELETE FROM "Usuario" WHERE "id" = ANY($1)', [idsUsuarioCriados]);
  await prisma.$disconnect();
  await databasePool.end();
});

describe("CategoriaRecomendacaoStrategy - fallback geral", () => {
  it("ordena o universo geral por vendas, nota media e UUID, limitado a oito", async () => {
    const resultado = await strategy.obter({ produtoId: produtoIsoladoId });

    expect(resultado.estrategia).toBe(ESTRATEGIA_FALLBACK);
    expect(resultado.itens.map((item) => item.id)).toEqual(ordemEsperadaUniverso());
  });

  it("nunca repete IDs e nunca supera oito itens", async () => {
    const resultado = await strategy.obter({ produtoId: produtoIsoladoId });

    const ids = resultado.itens.map((item) => item.id);
    expect(ids.length).toBeLessThanOrEqual(8);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("nunca inclui produto inativo ou sem estoque", async () => {
    const resultado = await strategy.obter({ produtoId: produtoIsoladoId });

    const ids = resultado.itens.map((item) => item.id);
    expect(ids).not.toContain(inativoId);
    expect(ids).not.toContain(semEstoqueId);
  });

  it("aciona o fallback quando o produto de contexto nao possui candidatos elegiveis na propria categoria", async () => {
    const resultado = await strategy.obter({ produtoId: produtoIsoladoId });

    expect(resultado.estrategia).toBe(ESTRATEGIA_FALLBACK);
    expect(resultado.itens.map((item) => item.id)).not.toContain(produtoIsoladoId);
  });

  it("aciona o fallback quando o produto de contexto nao existe", async () => {
    const resultado = await strategy.obter({ produtoId: randomUUID() });

    expect(resultado.estrategia).toBe(ESTRATEGIA_FALLBACK);
    expect(resultado.itens.map((item) => item.id)).toEqual(ordemEsperadaUniverso());
  });

  it("aciona o fallback sintetico para contexto usuarioId na U1, sem consultar historico pessoal", async () => {
    const usuarioSemHistoricoId = randomUUID();

    const resultado = await strategy.obter({ usuarioId: usuarioSemHistoricoId });

    expect(resultado.estrategia).toBe(ESTRATEGIA_FALLBACK);
    expect(resultado.itens.map((item) => item.id)).toEqual(ordemEsperadaUniverso());
  });
});

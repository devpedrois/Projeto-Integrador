import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

const conjuntos = [
  { notas: [5], calculoManual: "5 / 1 = 5", media: 5, total: 1 },
  { notas: [1, 2], calculoManual: "(1 + 2) / 2 = 1.5", media: 1.5, total: 2 },
  {
    notas: [4, 4, 5],
    calculoManual: "(4 + 4 + 5) / 3 = 4.333... -> 4.3",
    media: 4.3,
    total: 3,
  },
  {
    notas: [1, 2, 3, 4, 5, 5],
    calculoManual: "(1 + 2 + 3 + 4 + 5 + 5) / 6 = 3.333... -> 3.3",
    media: 3.3,
    total: 6,
  },
  {
    notas: [4, 5, 5],
    calculoManual: "(4 + 5 + 5) / 3 = 4.666... -> 4.7",
    media: 4.7,
    total: 3,
  },
];

let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
let app: ReturnType<typeof createApp>;
const produtos = new Map<string, string>();

beforeAll(async () => {
  banco = await criarBancoAuth();
  app = createApp(banco.prisma);
  const artesao = await banco.prisma.usuario.create({
    data: {
      nome: "Artesao sintetico 32.3",
      email: `${randomUUID()}@teste.origem`,
      senhaHash: "hash-sintetico",
      papel: "artesao",
    },
  });
  const categoria = await banco.prisma.categoria.create({
    data: { nome: "Medias sinteticas 32.3" },
  });
  const compradorIds: string[] = [];
  for (let indice = 0; indice < 6; indice += 1) {
    compradorIds.push(
      (
        await banco.prisma.usuario.create({
          data: {
            nome: "Comprador sintetico 32.3",
            email: `${randomUUID()}@teste.origem`,
            senhaHash: "hash-sintetico",
            papel: "comprador",
          },
        })
      ).id,
    );
  }
  for (const conjunto of conjuntos) {
    const produto = await banco.prisma.produto.create({
      data: {
        nome: "Peca sintetica 32.3",
        descricao: conjunto.calculoManual,
        preco: "10.00",
        quantidadeEstoque: 1,
        artesaoId: artesao.id,
        categoriaId: categoria.id,
        tecnicaId: "tecnica-modelagem-argila",
      },
    });
    await banco.prisma.avaliacao.createMany({
      data: conjunto.notas.map((nota, indice) => {
        const compradorId = compradorIds[indice];
        if (!compradorId) throw new Error("Comprador da fixture ausente");
        return { produtoId: produto.id, compradorId, nota };
      }),
    });
    produtos.set(conjunto.calculoManual, produto.id);
  }
}, 60000);

afterAll(async () => {
  await banco?.fechar();
}, 60000);

describe("32.3 media de avaliacoes na leitura com PostgreSQL real", () => {
  it.each(conjuntos)("confere $calculoManual", async (conjunto) => {
    const produtoId = produtos.get(conjunto.calculoManual);
    if (!produtoId) throw new Error("Produto da fixture ausente");
    const response = await request(app).get("/avaliacoes").query({ produtoId });
    expect(response.status).toBe(200);
    expect(response.body.resumo).toEqual({
      media: conjunto.media,
      total: conjunto.total,
    });
    expect(
      response.body.itens.map((item: { nota: number }) => item.nota).sort(),
    ).toEqual([...conjunto.notas].sort());
  });
});

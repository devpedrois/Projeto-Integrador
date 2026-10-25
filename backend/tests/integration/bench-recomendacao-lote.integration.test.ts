import { expect, it } from "vitest";
import { medirConfiguracaoLote } from "../../scripts/lib/bench-recomendacao-lote.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

it("30.6 executa quinze rodadas da Strategy real com pools C+2", async () => {
  const banco = await criarBancoAuth();
  try {
    const schemas = await banco.prisma.$queryRaw<
      { schema: string }[]
    >`SELECT current_schema() AS schema`;
    const schema = schemas[0]?.schema;
    const url = process.env.DIRECT_URL;
    if (!schema || !url) throw new Error("Ambiente de teste ausente");
    const artesao = await banco.prisma.usuario.create({
      data: {
        nome: "Artesao B2",
        email: "b2@origem.test",
        senhaHash: "sintetico",
        papel: "artesao",
      },
    });
    const categoria = await banco.prisma.categoria.create({
      data: { nome: "B2" },
    });
    const ids = [1, 2, 3, 4, 5, 6, 7].map(
      (n) => `b2060000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    );
    await banco.prisma.produto.createMany({
      data: ids.map((id, i) => ({
        id,
        nome: `Peca ${i}`,
        descricao: "Sintetica",
        preco: 10,
        categoriaId: categoria.id,
        artesaoId: artesao.id,
        tecnicaId: "tecnica-modelagem-argila",
        quantidadeEstoque: i === 4 ? 0 : 2,
        ativo: i !== 3,
        desativadoPorAdmin: i === 5,
      })),
    });
    const inativo = await banco.prisma.usuario.create({
      data: {
        nome: "Inativo B2",
        email: "inativo-b2@origem.test",
        senhaHash: "sintetico",
        papel: "artesao",
        ativo: false,
      },
    });
    const ultimo = ids[6];
    if (!ultimo) throw new Error("Fixture incompleta");
    await banco.prisma.produto.update({
      where: { id: ultimo },
      data: { artesaoId: inativo.id },
    });
    const rodadas = [];
    let sequencial;
    for (const concorrencia of [1, 4, 8] as const) {
      const resultado = await medirConfiguracaoLote({
        connectionString: url,
        concorrencia,
        schema,
        referencia: sequencial,
      });
      sequencial ??= resultado.referencia;
      rodadas.push(...resultado.rodadas);
      expect(resultado.referencia.map((p) => p.produtoId)).toEqual(
        ids.slice(0, 3),
      );
      expect(resultado.referencia[0]?.produtoIds).toEqual([
        ids[1],
        ids[2],
        ids[5],
        ids[6],
      ]);
      expect(resultado.diff).toEqual([]);
      expect(resultado.poolMax).toBe(concorrencia + 2);
      expect(resultado.conexoesPreparadas).toBe(concorrencia + 2);
      expect(resultado.somenteLeitura).toBe(true);
      expect(
        resultado.rodadas.every(
          (r) => r.picoTarefas <= concorrencia && r.identico,
        ),
      ).toBe(true);
    }
    expect(rodadas).toHaveLength(15);
    expect(rodadas.filter((r) => r.aquecimento)).toHaveLength(3);
    expect(new Set(rodadas.map((r) => r.hash)).size).toBe(1);
    expect(await banco.prisma.produto.count()).toBe(7);
  } finally {
    await banco.fechar();
  }
}, 120_000);

import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { criarBanco } from "../helpers/database.js";
import {
  medirReforcoRegional,
  formatarTabelaRegional,
} from "../../scripts/lib/metricas.js";
import { runMetrics, parseMetricsOptions } from "../../scripts/metricas.js";

let banco: Awaited<ReturnType<typeof criarBanco>>;
const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let config: { connectionString: string; apiSchema: string; recSchema: string };

beforeAll(async () => {
  banco = await criarBanco();
  const artesaos: string[] = [];
  for (const regiao of [
    "regiao-alto-moura-caruaru",
    "regiao-pilar-recife",
    null,
  ]) {
    const id = randomUUID();
    await banco.seed.query(
      `INSERT INTO "Usuario" (id,nome,email,"senhaHash",papel) VALUES ($1,'Sintetico',$2,'sintetico','artesao')`,
      [id, `${id}@teste.origem`],
    );
    await banco.seed.query(
      'INSERT INTO "PerfilArtesao" ("usuarioId","regiaoId") VALUES ($1,$2)',
      [id, regiao],
    );
    artesaos.push(id);
  }
  const categorias = Array.from({ length: 4 }, () => randomUUID());
  for (const id of categorias)
    await banco.seed.query('INSERT INTO "Categoria" (id,nome) VALUES ($1,$2)', [
      id,
      id,
    ]);
  for (let i = 1; i <= 15; i++) {
    await banco.seed.query(
      `INSERT INTO "Produto" (id,nome,descricao,preco,"quantidadeEstoque","artesaoId","categoriaId","tecnicaId","desativadoPorAdmin") VALUES ($1,$2,'Sintetico',10,1,$3,$4,'tecnica-modelagem-argila',$5)`,
      [
        uuid(i),
        `Produto ${i}`,
        artesaos[i === 14 ? 2 : i <= 6 || i >= 13 ? 0 : 1],
        categorias[i === 15 ? 3 : i === 13 ? 1 : i === 14 ? 2 : 0],
        i === 15,
      ],
    );
  }
  const url = new URL(banco.rec.options.connectionString as string);
  url.searchParams.delete("options");
  config = {
    connectionString: url.toString(),
    apiSchema: banco.options.apiSchema,
    recSchema: banco.options.recSchema,
  };
});
afterAll(async () => {
  if (banco) await banco.fechar();
});

it("preserva as metricas regionais usando dois lotes C=8 registrados", async () => {
  const medicao = await medirReforcoRegional(config, "ambos");
  const [on, off] = medicao.resultados;
  if (!on || !off) throw new Error("Comparacao incompleta");
  expect(medicao.resultados.map((r) => r.modo)).toEqual(["on", "off"]);
  for (const r of medicao.resultados) {
    expect(r).toMatchObject({
      produtos: 15,
      produtosElegiveis: 14,
      contextos: 14,
      contextosSemRegiao: 1,
      totalRecomendacoes: 112,
    });
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
  expect(formatarTabelaRegional(medicao.resultados)).toContain(
    "| on | 15 | 14 | 112 |",
  );
  expect(medicao.execucoes).toHaveLength(2);
  for (const execucao of medicao.execucoes) {
    const rows = await banco.rec.query(
      `SELECT concorrencia,"reforcoRegional","produtosProcessados","hashResultado" FROM "${config.recSchema}".execucao_lote WHERE id=$1`,
      [execucao.execucaoId],
    );
    expect(rows.rows).toEqual([
      {
        concorrencia: 8,
        reforcoRegional: execucao.reforcoRegional,
        produtosProcessados: 15,
        hashResultado: execucao.hashResultado,
      },
    ]);
  }
});

it.each(["on", "off"] as const)(
  "executa somente o modo %s solicitado",
  async (modo) => {
    const medicao = await medirReforcoRegional(config, modo);
    expect(medicao.resultados.map((r) => r.modo)).toEqual([modo]);
    expect(medicao.execucoes).toHaveLength(1);
  },
);

it("CLI gera JSON e diff vazio contra referencia fornecida", async () => {
  const pasta = await mkdtemp(join(tmpdir(), "metricas-36-2-"));
  const medicao = await medirReforcoRegional(config, "ambos");
  const referencia = join(pasta, "referencia.json");
  await writeFile(
    referencia,
    JSON.stringify({
      bases: [{ base: "volume", comparacaoRegional: medicao.resultados }],
    }),
  );
  const options = parseMetricsOptions([
    "--referencia",
    referencia,
    "--output",
    join(pasta, "resultado.json"),
  ]);
  const result = await runMetrics(options, {
    DATABASE_URL_VOLUME: config.connectionString,
    API_SCHEMA: config.apiSchema,
    RECOMENDACAO_SCHEMA: config.recSchema,
  });
  expect(result.diff).toEqual([]);
  expect(result.operacao).toMatchObject({
    nome: "gerarRecomendacoesEmLote",
    concorrencia: 8,
    poolMax: 10,
  });
  expect(JSON.parse(await readFile(options.output, "utf8"))).toEqual(result);
  expect(JSON.parse(await readFile(join(pasta, "diff.json"), "utf8"))).toEqual(
    [],
  );
  expect(JSON.stringify(result)).not.toMatch(
    /senhaHash|postgresql:|@teste.origem/,
  );
});

it("retorna zeros na base vazia sem NaN ou Infinity", async () => {
  const vazio = await criarBanco();
  try {
    const url = new URL(vazio.rec.options.connectionString as string);
    url.searchParams.delete("options");
    const medicao = await medirReforcoRegional(
      {
        connectionString: url.toString(),
        apiSchema: vazio.options.apiSchema,
        recSchema: vazio.options.recSchema,
      },
      "ambos",
    );
    for (const r of medicao.resultados) {
      expect(r.produtos).toBe(0);
      expect(r.totalRecomendacoes).toBe(0);
      for (const p of [
        r.coberturaCatalogo,
        r.coberturaContextos,
        r.taxaFallback,
        r.acertoCategoria,
        r.mesmaRegiao,
      ])
        expect(p).toEqual({ numerador: 0, denominador: 0, percentual: 0 });
    }
  } finally {
    await vazio.fechar();
  }
}, 120_000);

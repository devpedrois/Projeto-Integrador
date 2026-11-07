import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, expect, it } from "vitest";
import { criarBanco } from "../helpers/database.js";
import {
  gerarRecomendacoesEmLote,
  prepararLote,
} from "../../src/lote/index.js";
import { medirConfiguracaoLote } from "../../scripts/lib/bench-lote.js";

let banco: Awaited<ReturnType<typeof criarBanco>>;
let config: { connectionString: string; apiSchema: string; recSchema: string };
const ids = Array.from({ length: 12 }, () => randomUUID()).sort();

beforeAll(async () => {
  banco = await criarBanco();
  const categoria = randomUUID();
  const artesao = randomUUID();
  const outroArtesao = randomUUID();
  for (const [id, regiao] of [
    [artesao, "regiao-pilar-recife"],
    [outroArtesao, "regiao-alto-moura-caruaru"],
  ]) {
    await banco.seed.query(
      `INSERT INTO "Usuario" (id,nome,email,"senhaHash",papel) VALUES ($1,'Lote',$2,'sintetico','artesao')`,
      [id, `${id}@teste.origem`],
    );
    await banco.seed.query(
      'INSERT INTO "PerfilArtesao" ("usuarioId","regiaoId") VALUES ($1,$2)',
      [id, regiao],
    );
  }
  await banco.seed.query('INSERT INTO "Categoria" (id,nome) VALUES ($1,$2)', [
    categoria,
    categoria,
  ]);
  for (const [i, id] of ids.entries()) {
    await banco.seed.query(
      `INSERT INTO "Produto" (id,nome,descricao,preco,"artesaoId","categoriaId","tecnicaId","quantidadeEstoque",ativo,"desativadoPorAdmin") VALUES ($1,$7,'Sintetico',10,$2,$3,'tecnica-modelagem-argila',$4,$5,$6)`,
      [
        id,
        i < 5 ? artesao : outroArtesao,
        categoria,
        i === 11 ? 0 : 1,
        i !== 10,
        i === 9,
        id,
      ],
    );
  }
  config = {
    connectionString: banco.rec.options.connectionString as string,
    apiSchema: banco.options.apiSchema,
    recSchema: banco.options.recSchema,
  };
});

it("aplica o reforco regional na selecao efetiva do lote", async () => {
  const semReforco = await gerarRecomendacoesEmLote(
    { concorrencia: 4, reforcoRegional: false },
    config,
  );
  const comReforco = await gerarRecomendacoesEmLote(
    { concorrencia: 4, reforcoRegional: true },
    config,
  );
  expect(
    semReforco.resultados.find((r) => r.produtoId === ids[5])?.produtoIds,
  ).toEqual([ids[0], ids[1], ids[2], ids[3], ids[4], ids[6], ids[7], ids[8]]);
  expect(
    comReforco.resultados.find((r) => r.produtoId === ids[5])?.produtoIds,
  ).toEqual([ids[6], ids[7], ids[8], ids[9], ids[0], ids[1], ids[2], ids[3]]);
});

afterAll(async () => {
  if (banco) await banco.fechar();
});

it.each([false, true])(
  "preserva resultado ordenado C=1 e C=4, regional=%s",
  async (reforcoRegional) => {
    const antes = await banco.rec.query(
      `SELECT count(*) FROM "${config.recSchema}".execucao_lote`,
    );
    const sequencial = await gerarRecomendacoesEmLote(
      { concorrencia: 1, reforcoRegional },
      config,
    );
    const paralelo = await gerarRecomendacoesEmLote(
      { concorrencia: 4, reforcoRegional },
      config,
    );
    expect(paralelo.resultados).toEqual(sequencial.resultados);
    expect(paralelo.resultados.map((r) => r.produtoId)).toEqual(
      ids.slice(0, 10),
    );
    expect(
      paralelo.resultados.every(
        (r) => r.produtoIds.length === 8 && !r.produtoIds.includes(r.produtoId),
      ),
    ).toBe(true);
    for (const resultado of [sequencial, paralelo]) {
      const rows = await banco.rec.query(
        `SELECT * FROM "${config.recSchema}".execucao_lote WHERE id=$1`,
        [resultado.execucaoId],
      );
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0]).toMatchObject({
        concorrencia: resultado.concorrencia,
        reforcoRegional,
        produtosProcessados: 10,
        duracaoMs: resultado.duracaoMs,
        hashResultado: createHash("sha256")
          .update(JSON.stringify(resultado.resultados))
          .digest("hex"),
      });
      expect(rows.rows[0].finalizadoEm.getTime()).toBeGreaterThanOrEqual(
        rows.rows[0].iniciadoEm.getTime(),
      );
      expect(resultado.poolMax).toBe(resultado.concorrencia + 2);
      expect(resultado.picoTarefas).toBe(resultado.concorrencia);
    }
    const depois = await banco.rec.query(
      `SELECT count(*) FROM "${config.recSchema}".execucao_lote`,
    );
    expect(Number(depois.rows[0].count) - Number(antes.rows[0].count)).toBe(2);
  },
);

it.each([0, 9, -1, 1.5, NaN, Infinity])(
  "recusa concorrencia %s antes de conectar",
  async (concorrencia) => {
    await expect(
      gerarRecomendacoesEmLote(
        { concorrencia, reforcoRegional: false },
        {
          ...config,
          connectionString: "postgresql://invalido@localhost:1/ausente",
        },
      ),
    ).rejects.toThrow(/concorrencia/i);
  },
);

it("registra quinze execucoes do benchmark pelo papel restrito", async () => {
  const antes = await banco.rec.query(
    `SELECT count(*) FROM "${config.recSchema}".execucao_lote`,
  );
  let referencia;
  for (const concorrencia of [1, 4, 8] as const) {
    const medicao = await medirConfiguracaoLote({
      ...config,
      concorrencia,
      referencia,
    });
    referencia ??= medicao.referencia;
    expect(medicao.diff).toEqual([]);
    expect(medicao.rodadas).toHaveLength(5);
    expect(medicao.conexoesPreparadas).toBe(concorrencia + 2);
    for (const rodada of medicao.rodadas) {
      const row = await banco.rec.query(
        `SELECT "hashResultado" FROM "${config.recSchema}".execucao_lote WHERE id=$1`,
        [rodada.execucaoId],
      );
      expect(row.rows).toEqual([{ hashResultado: rodada.hash }]);
    }
  }
  const depois = await banco.rec.query(
    `SELECT count(*) FROM "${config.recSchema}".execucao_lote`,
  );
  expect(Number(depois.rows[0].count) - Number(antes.rows[0].count)).toBe(15);
}, 120_000);

it("recusa sobreposicao de execucoes na mesma sessao", async () => {
  const lote = await prepararLote(config, 1);
  try {
    const primeira = lote.gerarRecomendacoesEmLote({
      concorrencia: 1,
      reforcoRegional: false,
    });
    await expect(
      lote.gerarRecomendacoesEmLote({
        concorrencia: 1,
        reforcoRegional: false,
      }),
    ).rejects.toThrow(/andamento/);
    await primeira;
  } finally {
    await lote.fechar();
  }
});

it("mantem snapshot do catalogo durante a sessao preparada", async () => {
  const lote = await prepararLote(config, 4);
  try {
    await banco.seed.query('UPDATE "Produto" SET ativo=false WHERE id=$1', [
      ids[0],
    ]);
    const resultado = await lote.gerarRecomendacoesEmLote({
      concorrencia: 4,
      reforcoRegional: false,
    });
    expect(resultado.resultados.map((r) => r.produtoId)).toEqual(
      ids.slice(0, 10),
    );
  } finally {
    await banco.seed.query('UPDATE "Produto" SET ativo=true WHERE id=$1', [
      ids[0],
    ]);
    await lote.fechar();
  }
});

it("preserva uma linha incompleta quando a selecao falha", async () => {
  const lote = await prepararLote(config, 4);
  const antes = await banco.rec.query(
    `SELECT count(*) FROM "${config.recSchema}".execucao_lote`,
  );
  const view = `"${config.apiSchema}".rec_produtos_elegiveis`;
  const role = `"${banco.options.recRole}"`;
  try {
    await banco.admin.query(`REVOKE SELECT ON ${view} FROM ${role}`);
    await expect(
      lote.gerarRecomendacoesEmLote({
        concorrencia: 4,
        reforcoRegional: false,
      }),
    ).rejects.toMatchObject({ code: "42501" });
  } finally {
    await banco.admin.query(`GRANT SELECT ON ${view} TO ${role}`);
    await lote.fechar();
  }
  const depois = await banco.rec.query(
    `SELECT count(*) FROM "${config.recSchema}".execucao_lote`,
  );
  expect(Number(depois.rows[0].count) - Number(antes.rows[0].count)).toBe(1);
  const incompletas = await banco.rec.query(
    `SELECT "hashResultado","finalizadoEm" FROM "${config.recSchema}".execucao_lote WHERE "finalizadoEm" IS NULL`,
  );
  expect(incompletas.rows).toEqual([
    { hashResultado: null, finalizadoEm: null },
  ]);
});

it("CLI grava JSON e hash persistido usando PostgreSQL real", async () => {
  const saida = join(
    await mkdtemp(join(tmpdir(), "lote-cli-")),
    "resultado.json",
  );
  await promisify(execFile)(
    process.execPath,
    [
      "--import",
      "tsx",
      "src/lote/cli.ts",
      "--concorrencia",
      "4",
      "--reforco-regional",
      "--saida",
      saida,
    ],
    {
      env: {
        ...process.env,
        DATABASE_URL: config.connectionString,
        API_SCHEMA: config.apiSchema,
        RECOMENDACAO_SCHEMA: config.recSchema,
      },
    },
  );
  const resultado = JSON.parse(await readFile(saida, "utf8"));
  expect(resultado).toMatchObject({ concorrencia: 4, reforcoRegional: true });
  expect(resultado.resultados).toHaveLength(10);
  const rows = await banco.rec.query(
    `SELECT "hashResultado" FROM "${config.recSchema}".execucao_lote WHERE id=$1`,
    [resultado.execucaoId],
  );
  expect(rows.rows).toEqual([{ hashResultado: resultado.hashResultado }]);
});

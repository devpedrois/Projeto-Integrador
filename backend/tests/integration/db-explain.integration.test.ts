import "dotenv/config";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pool } from "pg";
import { expect, it } from "vitest";
import { criarBancoAuth } from "../helpers/auth-database.js";
import { runVolumeSeed } from "../../prisma/seed-volume.js";

it("BD.4 compara candidatos reais sem persistir indices ou mudar resultados", async () => {
  const { runExplain, parseExplainOptions } =
    await import("../../scripts/db-explain.js");
  const banco = await criarBancoAuth();
  try {
    await runVolumeSeed(banco.prisma);
    const [contexto] = await banco.prisma.$queryRaw<
      { schema: string }[]
    >`SELECT current_schema() AS schema`;
    if (!contexto || !process.env.DIRECT_URL)
      throw new Error("Schema isolado ausente");
    for (const candidate of [
      "confirmado-id",
      "confirmado-comprador",
      "confirmado-ordenacao",
    ]) {
      const output = await mkdtemp(join(tmpdir(), "origem-bd4-candidato-"));
      await runExplain(
        parseExplainOptions([
          "--volume",
          "--candidate",
          candidate,
          "--schema",
          contexto.schema,
          "--output",
          output,
        ]),
        {
          DATABASE_URL_VOLUME: process.env.DIRECT_URL,
          NODE_ENV: "test",
        },
      );
      const antes = JSON.parse(
        await readFile(
          join(output, "antes", "avaliacao-compra-verificada.json"),
          "utf8",
        ),
      );
      const depois = JSON.parse(
        await readFile(
          join(output, "depois", "avaliacao-compra-verificada.json"),
          "utf8",
        ),
      );
      expect(antes.resultHash).toMatch(/^[a-f0-9]{64}$/);
      expect(depois.resultHash).toBe(antes.resultHash);
      expect(depois.context.indexes.length).toBe(
        antes.context.indexes.length + 1,
      );
      expect(
        JSON.parse(await readFile(join(output, "rollback.json"), "utf8")),
      ).toMatchObject({ rollback: true, candidateAbsent: true });
      expect(await banco.prisma.pedido.count()).toBe(1500);
    }
    expect(
      await banco.prisma
        .$queryRaw`SELECT indexname FROM pg_indexes WHERE schemaname = ${contexto.schema} AND indexname LIKE 'Pedido_confirmado_%'`,
    ).toEqual([]);
  } finally {
    await banco.fechar();
  }
}, 60000);

it("db:explain grava pares reais, tabela e reverte o schema", async () => {
  expect(
    existsSync(new URL("../../scripts/db-explain.ts", import.meta.url)),
    "Script db:explain ausente",
  ).toBe(true);
  const { runExplain, parseExplainOptions } =
    await import("../../scripts/db-explain.js");
  const output = await mkdtemp(join(tmpdir(), "origem-bd04-"));
  const result = await runExplain(
    parseExplainOptions(["--compare", "--output", output]),
    {
      ...process.env,
      EXPLAIN_ISOLATED: "1",
    },
  );
  expect(await readdir(join(output, "antes"))).toHaveLength(19);
  expect(await readdir(join(output, "depois"))).toHaveLength(19);
  for (const name of [
    "indicadores-artesao",
    "pedidos-artesao",
    "pedidos-artesao-total",
    "pedidos-artesao-itens",
    "avaliacao-compra-verificada",
    "avaliacao-elegibilidade",
    "recomendacao-categoria",
    "recomendacao-regional",
    "recomendacao-historico",
    "recomendacao-fallback",
  ]) {
    const sample = JSON.parse(
      await readFile(join(output, "depois", `${name}.json`), "utf8"),
    );
    expect(sample.explain[0]["Execution Time"]).toBeTypeOf("number");
    expect(sample.explain[0].Plan["Actual Rows"]).toBeGreaterThan(0);
  }
  const antes = JSON.parse(
    await readFile(join(output, "antes", "vitrine-publica.json"), "utf8"),
  );
  const depois = JSON.parse(
    await readFile(join(output, "depois", "vitrine-publica.json"), "utf8"),
  );
  expect(antes.context.counts).toMatchObject({
    produtos: 1000,
    pedidos: 1500,
    artesaos: 50,
    compradores: 300,
  });
  expect(depois.context.counts).toEqual(antes.context.counts);
  expect(antes.context.schema).toBe(depois.context.schema);
  expect(antes.context.enableSeqscan).toBe("on");
  expect(depois.context.enableSeqscan).toBe("on");
  expect(
    antes.context.indexes.some(
      (i: { indexname: string }) =>
        i.indexname === "Produto_vitrine_criadoEm_idx",
    ),
  ).toBe(false);
  expect(
    depois.context.indexes.some(
      (i: { indexname: string }) =>
        i.indexname === "Produto_vitrine_criadoEm_idx",
    ),
  ).toBe(true);
  expect(depois.explain[0]["Execution Time"]).toBeTypeOf("number");
  expect(depois.explain[0].Plan["Actual Rows"]).toBe(24);
  const busca = JSON.parse(
    await readFile(join(output, "depois", "busca-termo.json"), "utf8"),
  );
  expect(busca.explain[0].Plan["Actual Rows"]).toBeGreaterThan(0);
  expect(await readFile(join(output, "resumo.md"), "utf8")).toContain(
    "Tempo antes ms | Tempo depois ms",
  );
  const pool = new Pool({ connectionString: process.env.DIRECT_URL });
  try {
    expect(
      (
        await pool.query(
          `SELECT 1 FROM information_schema.schemata WHERE schema_name = $1`,
          [result.schema],
        )
      ).rowCount,
    ).toBe(0);
  } finally {
    await pool.end();
  }
}, 60000);

it("db:explain atual mede tambem tabelas vazias sem alterar dados", async () => {
  const { runExplain, parseExplainOptions } =
    await import("../../scripts/db-explain.js");
  const output = await mkdtemp(join(tmpdir(), "origem-bd04-atual-"));
  await runExplain(parseExplainOptions(["--output", output]));
  expect(await readdir(join(output, "atual"))).toHaveLength(19);
  const notificacoes = JSON.parse(
    await readFile(join(output, "atual", "notificacoes-artesao.json"), "utf8"),
  );
  expect(notificacoes.explain[0]["Execution Time"]).toBeTypeOf("number");
  expect(notificacoes.context.schema).toBe("public");
  const original = await readFile(
    join(output, "atual", "notificacoes-artesao.json"),
    "utf8",
  );
  await expect(
    runExplain(parseExplainOptions(["--output", output])),
  ).rejects.toThrow();
  expect(
    await readFile(join(output, "atual", "notificacoes-artesao.json"), "utf8"),
  ).toBe(original);
}, 15000);

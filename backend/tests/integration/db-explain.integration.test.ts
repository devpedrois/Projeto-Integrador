import "dotenv/config";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pool } from "pg";
import { expect, it } from "vitest";

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
  expect(await readdir(join(output, "antes"))).toHaveLength(9);
  expect(await readdir(join(output, "depois"))).toHaveLength(9);
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
  expect(await readdir(join(output, "atual"))).toHaveLength(9);
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

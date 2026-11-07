import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { parseMetricsOptions, runMetrics } from "../../scripts/metricas.js";
import { compararMetricas } from "../../scripts/lib/metricas.js";

it("compara ambos os modos por padrao e aceita selecao explicita", () => {
  expect(parseMetricsOptions([]).reforcoRegional).toBe("ambos");
  for (const modo of ["on", "off", "ambos"])
    expect(
      parseMetricsOptions(["--reforco-regional", modo]).reforcoRegional,
    ).toBe(modo);
});
it.each(
  [
    ["--reforco-regional", "true"],
    ["--reforco-regional", ""],
    ["--output", ""],
    ["--isolado"],
    ["--concorrencia", "4"],
  ].map((args) => [args]),
)("recusa opcoes invalidas %j", (args) => {
  expect(() => parseMetricsOptions(args)).toThrow();
});

it("detecta e identifica cada diferenca numerica sem arredondar", () => {
  expect(
    compararMetricas(
      [{ modo: "on", taxa: { numerador: 1, percentual: 33.6875 } }],
      [{ modo: "on", taxa: { numerador: 2, percentual: 33.6876 } }],
    ),
  ).toEqual([
    { modo: "on", campo: "taxa.numerador", esperado: 1, recebido: 2 },
    {
      modo: "on",
      campo: "taxa.percentual",
      esperado: 33.6875,
      recebido: 33.6876,
    },
  ]);
});

it("nao aprova um modo de referencia que deixou de ser medido", () => {
  expect(compararMetricas([{ modo: "on", total: 8 }], [])).toEqual([
    {
      modo: "on",
      campo: "",
      esperado: { modo: "on", total: 8 },
      recebido: null,
    },
  ]);
});

it("preserva arquivos de saida antes de acessar PostgreSQL", async () => {
  const pasta = await mkdtemp(join(tmpdir(), "metricas-preservar-"));
  const output = join(pasta, "resultado.json");
  await writeFile(output, "anterior");
  await expect(
    runMetrics(parseMetricsOptions(["--output", output]), {
      DATABASE_URL_VOLUME: "postgresql://teste:segredo@localhost:1/volume",
    }),
  ).rejects.toThrow();
  expect(await readFile(output, "utf8")).toBe("anterior");
});

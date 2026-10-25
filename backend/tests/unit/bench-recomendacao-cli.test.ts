import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  executarBenchmarkLote,
  parseLoteOptions,
} from "../../scripts/bench-recomendacao-lote.js";

it("recusa flags desconhecidas e valores ausentes", () => {
  expect(() => parseLoteOptions(["--isolado"])).toThrow();
  expect(() => parseLoteOptions(["--output"])).toThrow();
  expect(() => parseLoteOptions(["--output", ""])).toThrow();
});

it("preserva evidencias existentes antes de conectar ao banco", async () => {
  const output = await mkdtemp(join(tmpdir(), "b2-preservar-"));
  const arquivo = join(output, "resultado.json");
  await writeFile(arquivo, "evidencia anterior");
  await expect(
    executarBenchmarkLote(
      { output },
      {
        DATABASE_URL_VOLUME: "postgresql://teste:segredo@localhost:1/volume",
      },
    ),
  ).rejects.toThrow("saida precisa ser nova");
  expect(await readFile(arquivo, "utf8")).toBe("evidencia anterior");
});

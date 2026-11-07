import { expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { parseOptions } from "../../src/lote/cli.js";

it("interpreta concorrencia, reforco regional e saida", () => {
  expect(
    parseOptions([
      "--concorrencia",
      "4",
      "--reforco-regional",
      "--saida",
      "lote.json",
    ]),
  ).toMatchObject({
    concorrencia: 4,
    reforcoRegional: true,
    saida: "lote.json",
  });
  expect(parseOptions(["--saida", "lote.json"])).toMatchObject({
    concorrencia: 1,
    reforcoRegional: false,
  });
});

it.each(
  [
    [],
    ["--saida", ""],
    ["--saida"],
    ["--extra"],
    ["--saida", "x", "--concorrencia", "9"],
    ["--saida", "x", "--concorrencia", "1.5"],
    ["--saida", "x", "--concorrencia", ""],
    ["--saida", "x", "--reforco-regional=false"],
  ].map((args) => [args]),
)("recusa argumentos invalidos %j", (args) => {
  expect(() => parseOptions(args)).toThrow();
});

it("CLI preserva arquivo existente e omite detalhes internos", async () => {
  const saida = join(
    await mkdtemp(join(tmpdir(), "lote-preservar-")),
    "resultado.json",
  );
  await writeFile(saida, "evidencia existente");
  await expect(
    promisify(execFile)(
      process.execPath,
      ["--import", "tsx", "src/lote/cli.ts", "--saida", saida],
      {
        env: {
          ...process.env,
          DATABASE_URL: "postgresql://teste:segredo@localhost:1/ausente",
        },
      },
    ),
  ).rejects.toMatchObject({
    code: 1,
    stdout: "",
    stderr:
      "Lote falhou. Confira argumentos, destino novo e configuracao do banco.\n",
  });
  expect(await readFile(saida, "utf8")).toBe("evidencia existente");
});

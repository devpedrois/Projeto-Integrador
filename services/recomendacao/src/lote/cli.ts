import "dotenv/config";
import { open } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { gerarRecomendacoesEmLote, opcoesLote } from "./index.js";

export function parseOptions(args: string[]) {
  const { values } = parseArgs({
    args,
    allowPositionals: false,
    options: {
      concorrencia: { type: "string", default: "1" },
      "reforco-regional": { type: "boolean", default: false },
      saida: { type: "string" },
    },
  });
  if (!values.saida?.trim() || !/^\d+$/.test(values.concorrencia))
    throw new Error("Argumentos invalidos");
  return {
    ...opcoesLote.parse({
      concorrencia: Number(values.concorrencia),
      reforcoRegional: values["reforco-regional"],
    }),
    saida: values.saida,
  };
}

async function main() {
  const { saida, ...options } = parseOptions(process.argv.slice(2));
  const arquivo = await open(saida, "wx");
  try {
    const resultado = await gerarRecomendacoesEmLote(options);
    await arquivo.writeFile(JSON.stringify(resultado, null, 2) + "\n");
  } finally {
    await arquivo.close();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(() => {
    process.stderr.write(
      "Lote falhou. Confira argumentos, destino novo e configuracao do banco.\n",
    );
    process.exitCode = 1;
  });
}

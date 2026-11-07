import "dotenv/config";
import { mkdir, open, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import { schemaName } from "../src/config/environment.js";
import { validarAmbienteLote } from "./lib/bench-lote.js";
import {
  compararMetricas,
  formatarTabelaRegional,
  medirReforcoRegional,
  referenciaSchema,
} from "./lib/metricas.js";

const optionsSchema = z.strictObject({
  reforcoRegional: z.enum(["on", "off", "ambos"]),
  output: z.string().trim().min(1),
  referencia: z.string().trim().min(1),
});
export type MetricsOptions = z.infer<typeof optionsSchema>;

export function parseMetricsOptions(args: string[]): MetricsOptions {
  try {
    const { values } = parseArgs({
      args,
      allowPositionals: false,
      options: {
        "reforco-regional": { type: "string", default: "ambos" },
        output: { type: "string" },
        referencia: { type: "string" },
      },
    });
    const options = optionsSchema.parse({
      reforcoRegional: values["reforco-regional"],
      output:
        values.output ??
        fileURLToPath(
          new URL(
            `../../../evidencias/PI4-36/36.2-metricas/execucao-${new Date().toISOString().replaceAll(/[:.]/g, "-")}/resultado.json`,
            import.meta.url,
          ),
        ),
      referencia:
        values.referencia ??
        fileURLToPath(
          new URL(
            "../../../backend/metricas/recomendacao-u2.json",
            import.meta.url,
          ),
        ),
    });
    return {
      ...options,
      output: resolve(options.output),
      referencia: resolve(options.referencia),
    };
  } catch {
    throw new Error("Argumentos de metricas invalidos.");
  }
}

export async function runMetrics(
  input: MetricsOptions,
  env: NodeJS.ProcessEnv = process.env,
) {
  const options = optionsSchema.parse(input);
  const connectionString = validarAmbienteLote(env);
  const config = {
    connectionString,
    apiSchema: schemaName.parse(env.API_SCHEMA ?? "public"),
    recSchema: schemaName.parse(env.RECOMENDACAO_SCHEMA ?? "recomendacao"),
  };
  const referencia = referenciaSchema.parse(
    JSON.parse(await readFile(options.referencia, "utf8")),
  );
  const output = resolve(options.output);
  await mkdir(dirname(output), { recursive: true });
  const arquivo = await open(output, "wx");
  try {
    const arquivoDiff = await open(resolve(dirname(output), "diff.json"), "wx");
    try {
      const medicao = await medirReforcoRegional(
        config,
        options.reforcoRegional,
      );
      const diff = compararMetricas(
        referencia.filter(
          (r) =>
            options.reforcoRegional === "ambos" ||
            r.modo === options.reforcoRegional,
        ),
        medicao.resultados,
      );
      const resultado = {
        versao: 3,
        capturadoEm: new Date().toISOString(),
        timezone: "America/Sao_Paulo",
        operacao: {
          nome: "gerarRecomendacoesEmLote",
          modulo: "services/recomendacao/src/lote/index.ts",
          concorrencia: 8,
          poolMax: 10,
          snapshot:
            "REPEATABLE READ READ ONLY compartilhado por catalogo e modos on/off; escrita apenas privada",
        },
        metodo: {
          selecao:
            "Uma execucao de lote por modo; nenhuma chamada propria de Strategy",
          projecao:
            "Somente contextos e candidatos visiveis; IDs unicos, sem proprio contexto",
          comparacao:
            "Totais, numeradores, denominadores e percentuais integrais contra a referencia regional de volume; nao compara latencia HTTP ou IDs historicos",
          mesmaRegiao: "Regioes ausentes nao contam como coincidencia",
        },
        bases: [
          {
            base: "volume",
            origem: "branch-configurada",
            comparacaoRegional: medicao.resultados,
          },
        ],
        execucoes: medicao.execucoes,
        registros: medicao.registros,
        referenciaCapturada: referencia,
        diff,
      };
      await arquivo.writeFile(JSON.stringify(resultado, null, 2) + "\n");
      await arquivoDiff.writeFile(JSON.stringify(diff, null, 2) + "\n");
      console.log(formatarTabelaRegional(medicao.resultados));
      console.log(
        `Comparacao regional: ${diff.length} diferencas; JSON e diff salvos.`,
      );
      return resultado;
    } finally {
      await arquivoDiff.close();
    }
  } finally {
    await arquivo.close();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  Promise.resolve()
    .then(() => runMetrics(parseMetricsOptions(process.argv.slice(2))))
    .catch(() => {
      console.error(
        "Metricas falharam. Confira argumentos, destinos novos e configuracao de volume.",
      );
      process.exitCode = 1;
    });
}

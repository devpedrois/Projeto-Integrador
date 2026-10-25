import "dotenv/config";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus, arch, platform } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
  BenchLoteError,
  medirConfiguracaoLote,
  resumirLote,
  validarAmbienteLote,
  type ResultadoProduto,
} from "./lib/bench-recomendacao-lote.js";

interface LoteOptions {
  output: string;
}

export function parseLoteOptions(args: string[]): LoteOptions {
  try {
    const { values } = parseArgs({
      args,
      allowPositionals: false,
      options: { output: { type: "string" } },
    });
    if (values.output !== undefined && !values.output.trim()) throw new Error();
    return {
      output: resolve(
        values.output ??
          fileURLToPath(
            new URL(
              `../../evidencias/PI4-30/benchmark-recomendacao/execucao-${new Date().toISOString().replaceAll(/[:.]/g, "-")}`,
              import.meta.url,
            ),
          ),
      ),
    };
  } catch {
    throw new BenchLoteError("argumentos invalidos.");
  }
}

async function salvarJson(pasta: string, nome: string, valor: unknown) {
  await writeFile(resolve(pasta, nome), JSON.stringify(valor, null, 2) + "\n", {
    flag: "wx",
  });
}

async function gerarGrafico(pasta: string, python: string) {
  const script = fileURLToPath(
    new URL("grafico-recomendacao-lote.py", import.meta.url),
  );
  await new Promise<void>((resolvePromise, reject) => {
    const processo = spawn(
      python,
      [
        script,
        resolve(pasta, "resultado.json"),
        resolve(pasta, "throughput.png"),
      ],
      { stdio: "ignore", windowsHide: true, shell: false, timeout: 60_000 },
    );
    processo.once("error", () =>
      reject(new BenchLoteError("Python com Matplotlib indisponivel.")),
    );
    processo.once("exit", (code) =>
      code === 0
        ? resolvePromise()
        : reject(
            new BenchLoteError("grafico falhou; consulte requisitos Python."),
          ),
    );
  });
}

export async function executarBenchmarkLote(
  options: LoteOptions,
  env: NodeJS.ProcessEnv = process.env,
) {
  const connectionString = validarAmbienteLote(env);
  const output = resolve(options.output);
  await mkdir(dirname(output), { recursive: true });
  try {
    await mkdir(output);
  } catch {
    throw new BenchLoteError("pasta de saida precisa ser nova.");
  }
  const configuracoes = [];
  let referencia: ResultadoProduto[] | undefined;
  for (const concorrencia of [1, 4, 8] as const) {
    console.log(`Preparando C=${concorrencia}; pool=${concorrencia + 2}...`);
    const { referencia: sequencial, ...resultado } =
      await medirConfiguracaoLote({
        connectionString,
        concorrencia,
        referencia,
        minimoProdutos: 1000,
        progresso: (message) => console.log(message),
      });
    if (!referencia) {
      referencia = sequencial;
      await salvarJson(output, "sequencial.json", referencia);
    }
    configuracoes.push(resultado);
    await salvarJson(output, `C-${concorrencia}.json`, resultado);
  }
  const rodadas = configuracoes.flatMap((c) => c.rodadas);
  const diff = configuracoes.flatMap((c) => c.diff);
  const aprovado = diff.length === 0 && rodadas.length === 15;
  const resumo = aprovado ? resumirLote(rodadas) : [];
  const contexto = {
    node: process.version,
    plataforma: platform(),
    arquitetura: arch(),
    processadores: cpus().length,
    cpu: cpus()[0]?.model,
    origem: "DATABASE_URL_VOLUME; branch separada dos bancos padrao e deploy",
    poolerNeon: new URL(connectionString).hostname.includes("-pooler."),
    postgres: configuracoes[0]?.postgres,
    maxConexoesPostgres: configuracoes[0]?.maxConexoesPostgres,
    somenteLeitura: true,
  };
  const metodologia = {
    estrategia:
      "CategoriaRecomendacaoStrategy existente, reforco regional padrao desligado",
    populacao: "Todos os produtos visiveis, em ordem de UUID; minimo de 1000",
    rodadasPorC: 5,
    aquecimentosPorC: 1,
    medicoesPorC: 4,
    totalRodadas: 15,
    concorrencias: [1, 4, 8],
    pool: "C+2 conexoes preabertas. Uma exporta snapshot; C+1 atendem as tarefas. Sem pool adicional.",
    snapshot:
      "REPEATABLE READ READ ONLY compartilhado pelas conexoes de cada C. Snapshot novo por C; cada resultado e comparado ao primeiro C=1.",
    estabilidade:
      "Branch de volume dedicada sem escritores concorrentes. Mudancas de ranking entre configuracoes aparecem no diff.",
    tempo:
      "performance.now: todas as chamadas obter da Strategy ate ultima conclusao. Exclui conexoes, catalogo, hash, diff, artefatos e setup.",
    aquecimento:
      "Primeira rodada por C registrada e verificada, descartada das medianas. Caches PostgreSQL e sistema nao sao esvaziados.",
    throughput: "Produtos elegiveis / duracao em segundos",
    speedup: "Mediana C=1 / mediana C",
    eficiencia: "Speedup / C; tabela apresenta percentual",
    paridade:
      "IDs ordenados de cada produto em todas as rodadas contra primeiro aquecimento C=1; SHA-256 adicional",
    esperaPool:
      "Pico waitingCount amostrado a cada 10ms; nao mede espera no pooler remoto",
    limite:
      "max_connections do PostgreSQL nao equivale a cota do pooler Neon. Ganho sublinear nao identifica sozinho a causa.",
  };
  const relatorio = {
    versao: 1,
    capturadoEm: new Date().toISOString(),
    timezone: "America/Sao_Paulo",
    aprovado,
    contexto,
    metodologia,
    rodadas,
    resumo,
  };
  await salvarJson(output, "resultado.json", relatorio);
  await salvarJson(output, "diff.json", diff);
  const sequencialMs = resumo[0]?.medianaMs ?? 0;
  const csv =
    [
      "concorrencia,pool_max,rodada,aquecimento,produtos,duracao_ms,throughput_produtos_s,speedup,eficiencia,identico,pico_tarefas,pico_espera_pool,sha256",
      ...rodadas.map((r) =>
        [
          r.concorrencia,
          r.poolMax,
          r.rodada,
          r.aquecimento,
          r.produtos,
          r.duracaoMs,
          r.throughput,
          sequencialMs / r.duracaoMs,
          sequencialMs / r.duracaoMs / r.concorrencia,
          r.identico,
          r.picoTarefas,
          r.picoEsperaPool,
          r.hash,
        ].join(","),
      ),
    ].join("\n") + "\n";
  await writeFile(resolve(output, "rodadas.csv"), csv, { flag: "wx" });
  const tabela = [
    "| C | Pool | Medicoes | Mediana s | Produtos/s | Speedup | Eficiencia % |",
    "|---:|---:|---:|---:|---:|---:|---:|",
    ...resumo.map(
      (r) =>
        `| ${r.concorrencia} | ${r.poolMax} | ${r.medicoes} | ${(r.medianaMs / 1000).toFixed(3)} | ${r.throughput.toFixed(3)} | ${r.speedup.toFixed(3)} | ${(r.eficiencia * 100).toFixed(2)} |`,
    ),
  ].join("\n");
  const observacoes = [
    "# 30.6: recomendacoes em lote",
    "",
    tabela,
    "",
    `Paridade: ${aprovado ? "aprovada" : "reprovada"}; ${rodadas.length} rodadas; ${diff.length} divergencias.`,
    "Cinco rodadas por C incluem um aquecimento e quatro medicoes.",
    "Medianas e throughput consolidado descartam os tres aquecimentos.",
    "CSV inclui todos os tempos e identifica os aquecimentos.",
    "Speedup por rodada usa a mediana sequencial como referencia.",
    `Maior throughput medido: ${Math.max(0, ...resumo.map((r) => r.throughput)).toFixed(3)} produtos/s.`,
    `Pico de espera no pool local: ${Math.max(...rodadas.map((r) => r.picoEsperaPool))}.`,
    "A medicao nao isola CPU, rede ou espera no pooler Neon.",
    "Ganho sublinear deve ser interpretado como limite observado do ambiente.",
    "Nao se atribui esse limite ao Neon sem telemetria do provedor.",
    "O exportador de snapshot usa uma das C+2 conexoes.",
    "Cada C utiliza snapshot proprio. Diff inclui mudancas entre snapshots.",
    "A Strategy permanece integralmente inalterada, inclusive sua elegibilidade interna.",
    "Os contextos usam visibilidade publica completa do catalogo.",
    "Sem HTTP, cache de aplicacao, seeds, migrations ou escrita na base.",
    "Ambiente e metodologia completos estao em resultado.json.",
    "",
  ].join("\n");
  await writeFile(resolve(output, "tabela.md"), observacoes, { flag: "wx" });
  if (aprovado)
    await gerarGrafico(output, env.BENCH_RECOMENDACAO_PYTHON ?? "python");
  console.log(tabela);
  console.log(`Artefatos: ${output}`);
  if (!aprovado)
    throw new BenchLoteError("resultados divergentes; confira diff.json.");
  return relatorio;
}

const executedFile = process.argv[1];
if (
  executedFile !== undefined &&
  import.meta.url === pathToFileURL(executedFile).href
) {
  Promise.resolve()
    .then(() => executarBenchmarkLote(parseLoteOptions(process.argv.slice(2))))
    .catch((error: unknown) => {
      console.error(
        error instanceof BenchLoteError
          ? error.message
          : "Benchmark de recomendacao falhou; detalhes internos omitidos.",
      );
      process.exitCode = 1;
    });
}

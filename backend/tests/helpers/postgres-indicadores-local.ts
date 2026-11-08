import { execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { setTimeout } from "node:timers/promises";
import { Pool } from "pg";

const executar = promisify(execFile);
const imagem = "postgres:16";

async function docker(args: string[], env = process.env) {
  return executar("docker", args, { windowsHide: true, timeout: 30000, env });
}

export async function iniciarPostgresIndicadores() {
  const identificador = randomUUID();
  const nome = `origem-cache-324-${identificador}`;
  const senha = randomBytes(32).toString("hex");
  let fechado = false;
  async function fechar() {
    if (fechado) return;
    try {
      const { stdout } = await docker([
        "container",
        "inspect",
        nome,
        "--format",
        "{{json .Config.Labels}}",
      ]);
      const labels: unknown = JSON.parse(stdout);
      if (
        typeof labels !== "object" ||
        labels === null ||
        !("origem.cache324" in labels) ||
        labels["origem.cache324"] !== identificador
      )
        throw new Error("Container nao pertence a esta execucao");
      await docker(["stop", "--time", "1", nome]);
      fechado = true;
    } catch {
      throw new Error(
        "Falha ao encerrar PostgreSQL temporario dos indicadores",
      );
    }
  }
  let iniciado = false;
  try {
    await docker(
      [
        "run",
        "--pull=never",
        "--rm",
        "--detach",
        "--name",
        nome,
        "--label",
        `origem.cache324=${identificador}`,
        "--publish",
        "127.0.0.1::5432",
        "--env",
        "POSTGRES_PASSWORD",
        "--env",
        "POSTGRES_DB=origem_cache_324",
        imagem,
      ],
      { ...process.env, POSTGRES_PASSWORD: senha },
    );
    iniciado = true;
    const { stdout } = await docker(["port", nome, "5432/tcp"]);
    const porta = /^127\.0\.0\.1:(\d+)\s*$/.exec(stdout)?.[1];
    if (!porta) throw new Error("Porta local ausente");
    const databaseUrl = `postgresql://postgres:${senha}@127.0.0.1:${porta}/origem_cache_324`;
    const pool = new Pool({
      connectionString: databaseUrl,
      max: 1,
      connectionTimeoutMillis: 1000,
    });
    try {
      let pronto = false;
      for (let tentativa = 0; tentativa < 40; tentativa++) {
        try {
          await pool.query("SELECT 1");
          pronto = true;
          break;
        } catch {
          await setTimeout(250);
        }
      }
      if (!pronto) throw new Error("PostgreSQL local indisponivel");
      await pool.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");
    } finally {
      await pool.end();
    }
    return {
      databaseUrl,
      imagem,
      fechar,
      nome,
      databaseUrlInterna: `postgresql://postgres:${senha}@127.0.0.1:5432/origem_cache_324`,
    };
  } catch {
    if (iniciado) await fechar();
    throw new Error(
      "Falha ao preparar PostgreSQL Docker isolado para indicadores",
    );
  }
}

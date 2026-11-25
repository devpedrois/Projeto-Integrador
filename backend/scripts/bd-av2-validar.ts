import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { Client } from "pg";
import { auditarCatalogo, FalhaValidacao } from "./lib/bd-av2-catalogo.js";
import { verificarD11 } from "./lib/bd-av2-d11.js";

export { verificarD11 };
const entregaveis = ["ddl.sql", "seed_dml.sql", "demo_erros.sql"] as const;
const sequencia = [
  "ddl.sql",
  "ddl.sql",
  "seed_dml.sql",
  "testes_restricoes.sql",
] as const;
const sqlDir = new URL("../../database/av2/", import.meta.url);
const evidencias = new URL("../../evidencias/bd-av2/", import.meta.url);
type Modo = "psql" | "pg";
type Registrar = (linha: string) => void;

export function conexaoLocal(valor: string | undefined) {
  if (!valor) throw new FalhaValidacao("BD_AV2_DATABASE_URL ausente.");
  try {
    const url = new URL(valor);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !["localhost", "127.0.0.1"].includes(url.hostname.toLowerCase()) ||
      url.port === "0" ||
      url.hash ||
      [...url.searchParams].some(([k, v]) => k !== "sslmode" || v !== "disable")
    )
      throw new Error();
    return {
      host: "127.0.0.1",
      port: Number(url.port || "5432"),
      database: decodeURIComponent(url.pathname.slice(1)) || "postgres",
      user: decodeURIComponent(url.username) || "postgres",
      password: decodeURIComponent(url.password),
      ssl: false,
      connectionTimeoutMillis: 5000,
      application_name: "origem_bd_av2",
    };
  } catch {
    throw new FalhaValidacao("BD_AV2_DATABASE_URL recusada.");
  }
}
type Configuracao = ReturnType<typeof conexaoLocal>;

function erroSeguro(erro: unknown): string {
  if (erro instanceof FalhaValidacao) return erro.message;
  if (
    typeof erro === "object" &&
    erro !== null &&
    "code" in erro &&
    typeof erro.code === "string" &&
    /^[0-9A-Z]{5}$/.test(erro.code)
  )
    return "SQLSTATE " + erro.code;
  return "Falha de conexão ou execução local.";
}

function docker(args: string[], input?: string, senha?: string) {
  const env = { ...process.env };
  delete env.BD_AV2_DATABASE_URL;
  return spawnSync("docker", args, {
    windowsHide: true,
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 8 * 1024 * 1024,
    input: input ?? "",
    env: {
      ...env,
      DOCKER_HOST: "",
      DOCKER_CONTEXT: "",
      DOCKER_TLS_VERIFY: "",
      PGPASSWORD: senha ?? "",
    },
  });
}

function consultarDocker(args: string[]): string {
  const r = docker(args);
  if (r.status !== 0) throw new FalhaValidacao("Docker local indisponível.");
  return r.stdout.trim();
}

function containerLocal(porta: number) {
  const contexto = process.env.DOCKER_CONTEXT;
  const endpoint =
    (!contexto && process.env.DOCKER_HOST) ||
    consultarDocker([
      "context",
      "inspect",
      ...(contexto ? [contexto] : []),
      "--format",
      "{{.Endpoints.docker.Host}}",
    ]);
  if (
    !/^unix:\/\/\/[^/]/.test(endpoint) &&
    !/^npipe:\/\/\/\/\.\/pipe\/[\w.-]+$/.test(endpoint)
  )
    throw new FalhaValidacao("Docker exige um socket local.");
  const args = ["--host", endpoint];
  const lista = consultarDocker([
    ...args,
    "ps",
    "--format",
    "{{.ID}} {{.Ports}}",
  ]);
  const portaPublicada = new RegExp(
    "(?:^|[ ,])(?:127\\.0\\.0\\.1|0\\.0\\.0\\.0):" +
      porta +
      "->5432/tcp(?:,|$)",
  );
  const linha = lista.split(/\r?\n/).find((l) => portaPublicada.test(l));
  const id = linha?.match(/^[a-f0-9]{12,64} /)?.[0].trim();
  if (!id)
    throw new FalhaValidacao(
      "Porta local sem publicação Docker para 5432/tcp.",
    );
  return [
    ...args,
    "exec",
    "-i",
    "--env",
    "PGPASSWORD",
    "--env",
    "PGHOSTADDR=127.0.0.1",
    "--env",
    "PGCLIENTENCODING=UTF8",
    id,
    "env",
    "-u",
    "PGSERVICE",
    "-u",
    "PGSERVICEFILE",
    "-u",
    "PGOPTIONS",
  ];
}

async function carregarSql(registrar: Registrar) {
  const fontes = new Map<string, string>();
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  for (const nome of [...entregaveis, "testes_restricoes.sql"]) {
    let sql: string;
    try {
      sql = decoder.decode(await readFile(new URL(nome, sqlDir)));
    } catch {
      throw new FalhaValidacao("Arquivo ausente ou UTF-8 inválido: " + nome);
    }
    const erros = verificarD11(sql);
    if (erros.length)
      throw new FalhaValidacao("D11 " + nome + ": " + erros.join(", "));
    fontes.set(nome, sql);
    registrar("D11 OK: " + nome);
  }
  return fontes;
}

function novoCliente(config: Configuracao, database = config.database) {
  const cliente = new Client({ ...config, database });
  cliente.on("error", () => {
    /* As operações rejeitadas são tratadas na borda. */
  });
  return cliente;
}

function executarPsql(
  exec: string[],
  config: Configuracao,
  banco: string,
  sql: string,
  avisos: Set<string>,
) {
  const r = docker(
    [
      ...exec,
      "psql",
      "-X",
      "-w",
      "-h",
      "127.0.0.1",
      "-p",
      "5432",
      "-U",
      config.user,
      "-d",
      banco,
      "-v",
      "ON_ERROR_STOP=1",
      "-v",
      "VERBOSITY=verbose",
      "-f",
      "-",
    ],
    sql,
    config.password,
  );
  const diagnostico = r.stderr ?? "";
  for (const m of diagnostico.matchAll(
    /NOTICE:\s+(?:00000:\s+)?OK ([a-z0-9_]+)\s*$/gm,
  ))
    if (m[1]) avisos.add(m[1]);
  if (r.status !== 0) {
    const estado = /(?:ERROR|FATAL):\s+([A-Z0-9]{5}):/.exec(diagnostico)?.[1];
    throw new FalhaValidacao(
      estado ? "SQLSTATE " + estado : "psql local falhou.",
    );
  }
}

async function executarModo(
  modo: Modo,
  admin: Client,
  config: Configuracao,
  exec: string[],
  fontes: Map<string, string>,
  registrar: Registrar,
) {
  const banco = "av2_" + modo + "_" + randomUUID().replaceAll("-", "");
  const cliente = novoCliente(config, banco);
  const avisos = new Set<string>();
  cliente.on("notice", (mensagem) => {
    const nome = /^OK ([a-z0-9_]+)$/.exec(mensagem.message ?? "")?.[1];
    if (nome) avisos.add(nome);
  });
  await admin.query("CREATE DATABASE " + banco + " TEMPLATE template0");
  try {
    await cliente.connect();
    registrar(modo + ": banco novo criado.");
    for (const nome of sequencia) {
      const sql = fontes.get(nome);
      if (sql === undefined)
        throw new FalhaValidacao("Arquivo ausente: " + nome);
      registrar(modo + ": " + nome);
      avisos.clear();
      if (modo === "psql") executarPsql(exec, config, banco, sql, avisos);
      else await cliente.query(sql);
      if (nome === "testes_restricoes.sql") {
        const esperados = [
          ...sql.matchAll(/RAISE NOTICE 'OK ([a-z0-9_]+)'/g),
        ].map((m) => m[1]);
        if (!esperados.length || esperados.some((n) => !n || !avisos.has(n)))
          throw new FalhaValidacao("Confirmação de teste ausente.");
        for (const teste of esperados) registrar("OK " + teste);
      }
    }
    await auditarCatalogo(cliente, registrar);
  } finally {
    try {
      await cliente.end();
    } finally {
      await admin.query("DROP DATABASE " + banco);
    }
  }
}

async function validar(registrar: Registrar) {
  const config = conexaoLocal(process.env.BD_AV2_DATABASE_URL);
  registrar("Destino: loopback. Parâmetros de conexão omitidos.");
  const fontes = await carregarSql(registrar);
  const exec = containerLocal(config.port);
  const admin = novoCliente(config);
  try {
    await admin.connect();
    const ver = await admin.query<{ server_version_num: string }>(
      "SHOW server_version_num",
    );
    if (Math.floor(Number(ver.rows[0]?.server_version_num) / 10000) !== 16)
      throw new FalhaValidacao("A validação exige PostgreSQL 16.");
    registrar("Servidor PostgreSQL 16 local confirmado.");
    let falhou = false;
    for (const modo of ["psql", "pg"] as const) {
      try {
        await executarModo(modo, admin, config, exec, fontes, registrar);
        registrar(modo + ": aprovado.");
      } catch (erro) {
        registrar(modo + ": " + erroSeguro(erro));
        falhou = true;
      }
    }
    if (falhou) throw new FalhaValidacao("Validação reprovada.");
  } finally {
    await admin.end();
  }
}

async function main() {
  const inicio = new Date().toISOString();
  const linhas = ["Origem | Validação BD AV2 | " + inicio];
  function registrar(linha: string) {
    linhas.push(linha);
    console.log(linha);
  }
  try {
    await validar(registrar);
    registrar("Validação aprovada nos dois modos.");
  } catch (erro) {
    registrar(erroSeguro(erro));
    process.exitCode = 1;
  }
  registrar("Código de saída: " + (process.exitCode ?? 0));
  try {
    await mkdir(evidencias, { recursive: true });
    const nome =
      "validacao-" +
      inicio.replaceAll(":", "-") +
      "-" +
      randomUUID().slice(0, 8) +
      ".txt";
    await writeFile(new URL(nome, evidencias), linhas.join("\n") + "\n", {
      flag: "wx",
    });
    console.log("Evidência: evidencias/bd-av2/" + nome);
  } catch {
    console.error("Não foi possível gravar a evidência.");
    process.exitCode = 1;
  }
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url)
  await main();

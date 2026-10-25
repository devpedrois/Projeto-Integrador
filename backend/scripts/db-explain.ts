import "dotenv/config";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import type { PoolClient } from "pg";
import { z } from "zod";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { runVolumeSeed } from "../prisma/seed-volume.js";

const migrationName = "20261014010000_indices_consultas";
const migrationsRoot = new URL("../prisma/migrations/", import.meta.url);
const queriesRoot = new URL("../prisma/consultas/", import.meta.url);
const candidateIndexes = {
  "confirmado-id":
    'CREATE INDEX "Pedido_confirmado_id_idx" ON "Pedido" (id) WHERE status = \'confirmado\'',
  "confirmado-comprador":
    'CREATE INDEX "Pedido_confirmado_compradorId_id_idx" ON "Pedido" ("compradorId", id) WHERE status = \'confirmado\'',
  "confirmado-ordenacao":
    'CREATE INDEX "Pedido_confirmado_criadoEm_id_idx" ON "Pedido" ("criadoEm" DESC, id DESC) WHERE status = \'confirmado\'',
} as const;
const optionsSchema = z
  .object({
    compare: z.boolean(),
    volume: z.boolean(),
    candidate: z
      .enum(["confirmado-id", "confirmado-comprador", "confirmado-ordenacao"])
      .optional(),
    schema: z.string().regex(/^[a-z][a-z0-9_]{0,62}$/),
    phase: z.enum(["antes", "depois", "atual"]),
    term: z.string().trim().min(3).max(120),
    output: z.string().min(1),
  })
  .strict()
  .refine(
    (o) => !o.candidate || (o.volume && !o.compare && o.phase === "atual"),
    "Candidato requer volume e ambas as fases",
  )
  .refine(
    (o) => !(o.volume && o.compare),
    "Volume nao recria a massa historica",
  );

export type ExplainOptions = z.infer<typeof optionsSchema>;
type Parameter = string | boolean | number | null | string[];
interface ExplainNode {
  "Node Type": string;
  "Index Name"?: string;
  "Relation Name"?: string;
  "Actual Rows": number;
  Plans?: ExplainNode[];
}
interface ExplainDocument {
  Plan: ExplainNode;
  "Planning Time": number;
  "Execution Time": number;
}
interface Sample {
  name: string;
  expectedIndexes: readonly string[];
  sql: string;
  parameters: Parameter[];
  resultHash: string;
  rowCount: number | null;
  explain: ExplainDocument[];
}

const catalog = [
  ["vitrine-publica", ["Produto_vitrine_criadoEm_idx"]],
  ["busca-termo", ["Produto_nome_trgm_idx", "Produto_descricao_trgm_idx"]],
  ["filtro-categoria", ["Produto_categoriaId_idx"]],
  ["filtro-tecnica", ["Produto_tecnicaId_idx"]],
  ["filtro-regiao", ["PerfilArtesao_regiaoId_idx", "Produto_artesaoId_idx"]],
  ["meus-pedidos", ["Pedido_compradorId_criadoEm_idx"]],
  ["poller-fila", ["IntencaoNotificacao_status_idx"]],
  ["notificacoes-artesao", ["Notificacao_usuarioId_lida_criadoEm_idx"]],
  ["itens-carrinho", ["ItemCarrinho_carrinhoId_produtoId_key"]],
  [
    "indicadores-artesao",
    ["Produto_artesaoId_idx", "ItemPedido_produtoId_idx", "Pedido_pkey"],
  ],
  [
    "pedidos-artesao",
    ["Produto_artesaoId_idx", "ItemPedido_produtoId_idx", "Pedido_pkey"],
  ],
  [
    "pedidos-artesao-total",
    ["Produto_artesaoId_idx", "ItemPedido_produtoId_idx", "Pedido_pkey"],
  ],
  [
    "pedidos-artesao-itens",
    ["ItemPedido_pedidoId_idx", "Produto_pkey", "Produto_artesaoId_idx"],
  ],
  [
    "avaliacao-compra-verificada",
    [
      "Pedido_compradorId_criadoEm_idx",
      "ItemPedido_produtoId_idx",
      "ItemPedido_pedidoId_idx",
    ],
  ],
  [
    "avaliacao-elegibilidade",
    [
      "Pedido_compradorId_criadoEm_idx",
      "ItemPedido_produtoId_idx",
      "Avaliacao_compradorId_produtoId_key",
    ],
  ],
  [
    "recomendacao-categoria",
    [
      "Produto_categoriaId_idx",
      "ItemPedido_produtoId_idx",
      "Avaliacao_produtoId_idx",
    ],
  ],
  [
    "recomendacao-regional",
    [
      "Produto_categoriaId_idx",
      "ItemPedido_produtoId_idx",
      "Avaliacao_produtoId_idx",
    ],
  ],
  [
    "recomendacao-historico",
    [
      "Pedido_compradorId_criadoEm_idx",
      "ItemPedido_pedidoId_idx",
      "Avaliacao_produtoId_idx",
    ],
  ],
  [
    "recomendacao-fallback",
    [
      "Pedido_compradorId_criadoEm_idx",
      "ItemPedido_pedidoId_idx",
      "Avaliacao_produtoId_idx",
    ],
  ],
] as const;
const tables = [
  "Produto",
  "Pedido",
  "Usuario",
  "PerfilArtesao",
  "IntencaoNotificacao",
  "Notificacao",
  "ItemCarrinho",
  "ItemPedido",
  "Avaliacao",
];

export function parseExplainOptions(args: string[]): ExplainOptions {
  const { values } = parseArgs({
    args,
    options: {
      compare: { type: "boolean", default: false },
      volume: { type: "boolean", default: false },
      candidate: { type: "string" },
      schema: { type: "string" },
      phase: { type: "string" },
      termo: { type: "string" },
      output: { type: "string" },
    },
    allowPositionals: false,
  });
  if (
    values.compare &&
    (values.schema !== undefined || values.phase !== undefined)
  ) {
    throw new Error("Comparacao usa schema isolado e ambas as fases");
  }
  return optionsSchema.parse({
    compare: values.compare,
    volume: values.volume,
    candidate: values.candidate,
    schema: values.schema ?? "public",
    phase: values.phase ?? "atual",
    term: values.termo ?? "vaso",
    output: resolve(
      values.output ??
        `../evidencias/${values.volume ? "PI4-BD-W12-Indices-Consultas/BD.4-indices-suporte" : "PI4-28-W10-Modelo-Fisico/BD-04-indices"}/${new Date().toISOString().replaceAll(/[:.]/g, "-")}`,
    ),
  });
}

function databaseIdentity(value: string): string {
  const url = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    url.pathname.length < 2
  ) {
    throw new Error("URL PostgreSQL invalida");
  }
  return `${url.hostname.replace(/-pooler(?=\.)/, "")}:${url.port || "5432"}${url.pathname}`;
}

export function validateExplainEnvironment(
  env: NodeJS.ProcessEnv,
  compare: boolean,
  volume = false,
): string {
  if (volume) {
    if (!env.DATABASE_URL_VOLUME || env.NODE_ENV === "production")
      throw new Error("Volume requer branch separada fora de producao");
    const identity = databaseIdentity(env.DATABASE_URL_VOLUME);
    if (
      [env.DIRECT_URL, env.DATABASE_URL, env.DATABASE_URL_DEPLOY].some(
        (value) => value && databaseIdentity(value) === identity,
      )
    )
      throw new Error("Volume deve ser separado das bases padrao e deploy");
    return env.DATABASE_URL_VOLUME;
  }
  if (!env.DIRECT_URL) throw new Error("DIRECT_URL obrigatoria");
  const identity = databaseIdentity(env.DIRECT_URL);
  if (env.DATABASE_URL && databaseIdentity(env.DATABASE_URL) !== identity) {
    throw new Error("DIRECT_URL e DATABASE_URL precisam da mesma branch");
  }
  if (
    compare &&
    (env.EXPLAIN_ISOLATED !== "1" || env.NODE_ENV === "production")
  ) {
    throw new Error("Comparacao requer EXPLAIN_ISOLATED=1 fora de producao");
  }
  if (
    compare &&
    env.DATABASE_URL_DEPLOY &&
    databaseIdentity(env.DATABASE_URL_DEPLOY) === identity
  ) {
    throw new Error("Comparacao proibida na base do deploy");
  }
  return env.DIRECT_URL;
}

export function searchPattern(term: string): string {
  return `%${term.trim().replace(/[\\%_]/g, "\\$&")}%`;
}

async function migrationSql(name: string): Promise<string> {
  return (
    await readFile(new URL(`${name}/migration.sql`, migrationsRoot), "utf8")
  )
    .replace(/^BEGIN;\s*/, "")
    .replace(/COMMIT;\s*$/, "");
}

async function prepareSchema(
  client: PoolClient,
  schema: string,
): Promise<void> {
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.query(`SET LOCAL search_path TO "${schema}"`);
  for (const name of (await readdir(migrationsRoot))
    .filter((n) => /^\d/.test(n) && n !== migrationName)
    .sort()) {
    await client.query(await migrationSql(name));
  }
}

async function supplementVolume(client: PoolClient): Promise<void> {
  await client.query(`INSERT INTO "IntencaoNotificacao" (id, "pedidoId", status, "criadoEm", "atualizadoEm")
    SELECT md5('bd04-intencao:' || id)::uuid, id,
      CASE WHEN n <= 5 THEN 'pendente' WHEN n <= 10 THEN 'falha' ELSE 'processada' END::"StatusIntencao",
      "criadoEm", "criadoEm"
    FROM (SELECT id, "criadoEm", row_number() OVER (ORDER BY id) n FROM "Pedido") pedidos`);
  await client.query(`INSERT INTO "Notificacao" (id, "usuarioId", "pedidoId", tipo, lida, "criadoEm")
    SELECT md5('bd04-notificacao:' || ip."pedidoId" || p."artesaoId")::uuid,
      p."artesaoId", ip."pedidoId", 'novo_pedido', (row_number() OVER (ORDER BY ip."pedidoId") % 3 = 0), pedido."criadoEm"
    FROM "ItemPedido" ip JOIN "Produto" p ON p.id = ip."produtoId"
    JOIN "Pedido" pedido ON pedido.id = ip."pedidoId"`);
  await client.query(`INSERT INTO "ItemCarrinho" (id, "carrinhoId", "produtoId", quantidade, "precoUnitario")
    SELECT md5('bd04-carrinho:' || c."usuarioId")::uuid, c."usuarioId", p.id, 1, p.preco
    FROM (SELECT "usuarioId", row_number() OVER (ORDER BY "usuarioId") n FROM "Carrinho") c
    JOIN (SELECT id, preco, row_number() OVER (ORDER BY id) n FROM "Produto") p ON p.n = c.n`);
}

async function analyze(client: PoolClient): Promise<void> {
  for (const table of tables) await client.query(`ANALYZE "${table}"`);
}

async function parametersForQueries(
  client: PoolClient,
  term: string,
): Promise<Record<string, Parameter[]>> {
  async function firstId(sql: string): Promise<string> {
    const result = await client.query<{ id: string }>(sql);
    return result.rows[0]?.id ?? "00000000-0000-0000-0000-000000000000";
  }
  const artesao = await firstId(
    `SELECT p."artesaoId" id FROM "Produto" p JOIN "ItemPedido" i ON i."produtoId" = p.id GROUP BY p."artesaoId" ORDER BY count(*) DESC, p."artesaoId" LIMIT 1`,
  );
  const compra = (
    await client.query<{
      compradorId: string;
      produtoId: string;
      categoriaId: string;
      regiaoId: string | null;
    }>(
      `SELECT pe."compradorId", i."produtoId", p."categoriaId", pa."regiaoId" FROM "Pedido" pe JOIN "ItemPedido" i ON i."pedidoId" = pe.id JOIN "Produto" p ON p.id = i."produtoId" LEFT JOIN "PerfilArtesao" pa ON pa."usuarioId" = p."artesaoId" WHERE pe.status = 'confirmado' ORDER BY pe.id, i.id LIMIT 1`,
    )
  ).rows[0];
  const zero = "00000000-0000-0000-0000-000000000000";
  const comprador = compra?.compradorId ?? zero;
  const produto = compra?.produtoId ?? zero;
  const pedidos = (
    await client.query<{ id: string }>(
      `SELECT pe.id FROM "Pedido" pe WHERE pe.status = 'confirmado' AND EXISTS (SELECT 1 FROM "ItemPedido" i JOIN "Produto" p ON p.id = i."produtoId" WHERE i."pedidoId" = pe.id AND p."artesaoId" = $1::uuid) ORDER BY pe."criadoEm" DESC, pe.id DESC LIMIT 20`,
      [artesao],
    )
  ).rows.map(({ id }) => id);
  return {
    "indicadores-artesao": [artesao],
    "pedidos-artesao": ["confirmado", artesao, 20, 0],
    "pedidos-artesao-total": ["confirmado", artesao],
    "pedidos-artesao-itens": [artesao, pedidos],
    "avaliacao-compra-verificada": [comprador, produto],
    "avaliacao-elegibilidade": [comprador, produto],
    "recomendacao-categoria": [compra?.categoriaId ?? zero, produto, 8],
    "recomendacao-regional": [
      compra?.categoriaId ?? zero,
      produto,
      8,
      compra?.regiaoId ?? null,
    ],
    "recomendacao-historico": [comprador, 8],
    "recomendacao-fallback": [produto, comprador, 8],
    "vitrine-publica": [],
    "busca-termo": [searchPattern(term)],
    "filtro-categoria": [
      await firstId(
        `SELECT "categoriaId" id FROM "Produto" GROUP BY "categoriaId" ORDER BY count(*) DESC, "categoriaId" LIMIT 1`,
      ),
    ],
    "filtro-tecnica": [
      await firstId(
        `SELECT "tecnicaId" id FROM "Produto" GROUP BY "tecnicaId" ORDER BY count(*), "tecnicaId" LIMIT 1`,
      ),
    ],
    "filtro-regiao": [
      await firstId(
        `SELECT "regiaoId" id FROM "PerfilArtesao" WHERE "regiaoId" IS NOT NULL GROUP BY "regiaoId" ORDER BY count(*), "regiaoId" LIMIT 1`,
      ),
    ],
    "meus-pedidos": [
      await firstId(
        `SELECT "compradorId" id FROM "Pedido" GROUP BY "compradorId" ORDER BY count(*) DESC, "compradorId" LIMIT 1`,
      ),
    ],
    "poller-fila": [],
    "notificacoes-artesao": [
      await firstId(
        `SELECT "usuarioId" id FROM "Notificacao" WHERE NOT lida GROUP BY "usuarioId" ORDER BY count(*) DESC, "usuarioId" LIMIT 1`,
      ),
      false,
    ],
    "itens-carrinho": [
      await firstId(
        `SELECT "carrinhoId" id FROM "ItemCarrinho" ORDER BY "carrinhoId" LIMIT 1`,
      ),
    ],
  };
}

async function context(client: PoolClient, schema: string) {
  const counts = await client.query(`SELECT
    (SELECT count(*)::int FROM "Produto") produtos,
    (SELECT count(*)::int FROM "Pedido") pedidos,
    (SELECT count(*)::int FROM "ItemPedido") "itensPedido",
    (SELECT count(*)::int FROM "Avaliacao") avaliacoes,
    (SELECT count(*)::int FROM "Pedido" WHERE status = 'confirmado') "pedidosConfirmados",
    (SELECT count(*)::int FROM "Usuario" WHERE papel = 'artesao') artesaos,
    (SELECT count(*)::int FROM "Usuario" WHERE papel = 'comprador') compradores,
    (SELECT count(*)::int FROM "IntencaoNotificacao") intencoes,
    (SELECT count(*)::int FROM "Notificacao") notificacoes,
    (SELECT count(*)::int FROM "ItemCarrinho") "itensCarrinho"`);
  const indexes = await client.query<{ indexname: string; indexdef: string }>(
    `SELECT indexname, indexdef, pg_relation_size(format('%I.%I', schemaname, indexname)::regclass)::text AS "sizeBytes" FROM pg_indexes WHERE schemaname = $1 ORDER BY indexname`,
    [schema],
  );
  const settings = await client.query<{
    version: string;
    enableSeqscan: string;
  }>(
    `SELECT version(), current_setting('enable_seqscan') AS "enableSeqscan", current_setting('plan_cache_mode') AS "planCacheMode"`,
  );
  const categories = await client.query(
    `SELECT "categoriaId", count(*)::int quantidade FROM "Produto" GROUP BY "categoriaId" ORDER BY "categoriaId"`,
  );
  const techniques = await client.query(
    `SELECT "tecnicaId", count(*)::int quantidade FROM "Produto" GROUP BY "tecnicaId" ORDER BY "tecnicaId"`,
  );
  const regions = await client.query(
    `SELECT pa."regiaoId", count(*)::int quantidade FROM "Produto" p JOIN "PerfilArtesao" pa ON pa."usuarioId" = p."artesaoId" GROUP BY pa."regiaoId" ORDER BY pa."regiaoId"`,
  );
  return {
    schema,
    capturedAt: new Date().toISOString(),
    ...settings.rows[0],
    counts: counts.rows[0],
    indexes: indexes.rows,
    categories: categories.rows,
    techniques: techniques.rows,
    regions: regions.rows,
  };
}

async function capture(
  client: PoolClient,
  schema: string,
  output: string,
  phase: string,
  parameters: Record<string, Parameter[]>,
): Promise<Sample[]> {
  const directory = join(output, phase);
  await mkdir(directory, { recursive: true });
  const metadata = await context(client, schema);
  const samples: Sample[] = [];
  for (const [name, expectedIndexes] of catalog) {
    const sql = await readFile(new URL(`${name}.sql`, queriesRoot), "utf8");
    const values = parameters[name];
    if (!values) throw new Error("Parametros ausentes");
    const warmup = await client.query<Record<string, unknown>>(sql, values);
    const resultHash = createHash("sha256")
      .update(
        JSON.stringify(
          warmup.rows.map((row) =>
            Object.fromEntries(
              Object.entries(row).filter(([key]) => key !== "atualizadoEm"),
            ),
          ),
        ),
      )
      .digest("hex");
    const result = await client.query<{ "QUERY PLAN": ExplainDocument[] }>(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`,
      values,
    );
    const explain = result.rows[0]?.["QUERY PLAN"];
    if (!explain?.[0]) throw new Error("Plano ausente");
    const sample = {
      name,
      expectedIndexes,
      sql,
      parameters: values,
      resultHash,
      rowCount: warmup.rowCount,
      explain,
    };
    await writeFile(
      join(directory, `${name}.json`),
      JSON.stringify({ phase, context: metadata, ...sample }, null, 2) + "\n",
      { flag: "wx" },
    );
    samples.push(sample);
  }
  return samples;
}

function nodes(plan: ExplainNode): string[] {
  const detail = plan["Index Name"] ?? plan["Relation Name"];
  return [
    `${plan["Node Type"]}${detail ? ` (${detail})` : ""}`,
    ...(plan.Plans ?? []).flatMap(nodes),
  ];
}

async function summary(
  output: string,
  before: Sample[],
  after?: Sample[],
): Promise<void> {
  const lines = [
    "# Consultas e indices: Sprint 4 e BD.4",
    "",
    "Tempos de execucao do servidor, em milissegundos.",
    "Uma execucao de aquecimento precede cada EXPLAIN.",
    "Nao representa p95 nem latencia HTTP.",
    "",
    "| Consulta | Indices candidatos ou existentes | Plano antes | Plano depois | Tempo antes ms | Tempo depois ms |",
    "|---|---|---|---|---:|---:|",
  ];
  for (const [index, sample] of before.entries()) {
    const initial = sample.explain[0];
    const final = after?.[index]?.explain[0];
    if (!initial) throw new Error("Plano ausente");
    lines.push(
      `| ${sample.name} | ${sample.expectedIndexes.join(", ")} | ${nodes(initial.Plan).join(" → ")} | ${final ? nodes(final.Plan).join(" → ") : "Nao comparado"} | ${initial["Execution Time"]} | ${final?.["Execution Time"] ?? "Nao comparado"} |`,
    );
  }
  lines.push(
    "",
    "O planner permanece livre: enable_seqscan nunca e desativado.",
    "Seq Scan pode custar menos em tabelas pequenas e filtros amplos.",
    "O LIMIT pode favorecer o indice parcial ordenado, mesmo com outros indices.",
    "Categoria e carrinho ja possuem indices anteriores a BD-04.",
    "",
    "ItemCarrinho(carrinhoId) usa o prefixo esquerdo do unique composto",
    "ItemCarrinho(carrinhoId, produtoId). Nenhum indice redundante foi criado.",
    "",
  );
  await writeFile(join(output, "resumo.md"), lines.join("\n"), { flag: "wx" });
}

export async function runExplain(
  options: ExplainOptions,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ schema: string; output: string }> {
  optionsSchema.parse(options);
  const connectionString = validateExplainEnvironment(
    env,
    options.compare,
    options.volume,
  );
  await mkdir(options.output, { recursive: true });
  if ((await readdir(options.output)).length > 0)
    throw new Error("Diretorio de saida precisa estar vazio");
  const schema = options.compare
    ? `bd04_${randomUUID().replaceAll("-", "")}`
    : options.schema;
  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 0,
  });
  let client: PoolClient | undefined;
  let prisma: PrismaClient | undefined;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
    transactionStarted = true;
    await client.query("SET LOCAL statement_timeout = '60s'");
    await client.query("SET LOCAL lock_timeout = '5s'");
    if (options.compare) {
      await prepareSchema(client, schema);
      const pid = (
        await client.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")
      ).rows[0]?.pid;
      client.release();
      client = undefined;
      prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
      await runVolumeSeed(prisma);
      client = await pool.connect();
      if (
        (await client.query<{ pid: number }>("SELECT pg_backend_pid() AS pid"))
          .rows[0]?.pid !== pid
      ) {
        throw new Error("Conexao transacional substituida");
      }
      await supplementVolume(client);
      await analyze(client);
    } else {
      const existing = await client.query(
        `SELECT 1 FROM information_schema.schemata WHERE schema_name = $1`,
        [schema],
      );
      if (existing.rowCount !== 1) throw new Error("Schema inexistente");
      await client.query(`SET LOCAL search_path TO "${schema}"`);
    }
    const parameters = await parametersForQueries(client, options.term);
    if (options.candidate) await analyze(client);
    const before = await capture(
      client,
      schema,
      options.output,
      options.compare || options.candidate ? "antes" : options.phase,
      parameters,
    );
    if (options.compare || options.candidate) {
      await client.query(
        options.candidate
          ? candidateIndexes[options.candidate]
          : await migrationSql(migrationName),
      );
      await analyze(client);
      const after = await capture(
        client,
        schema,
        options.output,
        "depois",
        parameters,
      );
      if (
        options.candidate &&
        before.some((sample, i) => sample.resultHash !== after[i]?.resultHash)
      )
        throw new Error("Candidato alterou resultados das consultas");
      await summary(options.output, before, after);
    } else {
      await summary(options.output, before);
    }
    return { schema, output: options.output };
  } finally {
    try {
      if (transactionStarted) {
        client ??= await pool.connect();
        await client.query("ROLLBACK");
        if (options.candidate)
          await recordCandidateRollback(client, schema, options);
      }
    } finally {
      client?.release();
      try {
        await prisma?.$disconnect();
      } finally {
        await pool.end();
      }
    }
  }
}

async function recordCandidateRollback(
  client: PoolClient,
  schema: string,
  options: ExplainOptions,
): Promise<void> {
  if (!options.candidate) return;
  const name = candidateIndexes[options.candidate].match(
    /CREATE INDEX "([^"]+)"/,
  )?.[1];
  const remaining = await client.query(
    "SELECT 1 FROM pg_indexes WHERE schemaname = $1 AND indexname = $2",
    [schema, name],
  );
  if (remaining.rowCount !== 0)
    throw new Error("Indice candidato permaneceu apos rollback");
  await writeFile(
    join(options.output, "rollback.json"),
    JSON.stringify(
      {
        rollback: true,
        candidate: options.candidate,
        candidateAbsent: true,
        connectionSource: "DATABASE_URL_VOLUME",
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
}

const executedFile = process.argv[1];
if (
  executedFile !== undefined &&
  import.meta.url === pathToFileURL(executedFile).href
) {
  Promise.resolve()
    .then(() => runExplain(parseExplainOptions(process.argv.slice(2))))
    .then(({ output }) => console.log(`EXPLAIN salvo em ${output}`))
    .catch(() => {
      process.stderr.write(
        "db:explain recusado ou falhou. Confira argumentos, ambiente e banco.\n",
      );
      process.exitCode = 1;
    });
}

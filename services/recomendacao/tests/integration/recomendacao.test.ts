import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, expect, it } from "vitest";
import request from "supertest";
import { escapeIdentifier } from "pg";
import { criarBanco } from "../helpers/database.js";
import { createApp } from "../../src/app.js";
import { PgRecomendacaoRepository } from "../../src/repositories/recomendacao.repository.js";
import { CategoriaRecomendacaoStrategy } from "../../src/strategies/categoria-recomendacao.strategy.js";
import { HistoricoCompraRecomendacaoStrategy } from "../../src/strategies/historico-compra-recomendacao.strategy.js";
import { bootstrapPermissoes } from "../../scripts/bootstrap-permissoes.js";
import { migrate } from "../../scripts/migrate.js";
import type { RecomendacaoStrategy } from "../../src/strategies/recomendacao.strategy.js";

const token = "token-sintetico-exclusivo-para-testes-35-1";
let banco: Awaited<ReturnType<typeof criarBanco>>;
let app: ReturnType<typeof createApp>;
let repo: PgRecomendacaoRepository;
let categoria: CategoriaRecomendacaoStrategy;
let historico: HistoricoCompraRecomendacaoStrategy;
let original: RecomendacaoStrategy;
let originalRegional: RecomendacaoStrategy;
let originalHistorico: RecomendacaoStrategy;
let desconectar: () => Promise<void>;
const comprador = "10000000-0000-4000-8000-000000000001";
const outro = "10000000-0000-4000-8000-000000000002";
const artesao = "10000000-0000-4000-8000-000000000003";
const categoriaId = "20000000-0000-4000-8000-000000000001";
const ids = new Map<string, string>();
let contexto: string;

beforeAll(async () => {
  banco = await criarBanco();
  const fixture = JSON.parse(
    await readFile(
      new URL(
        "../../../../fixtures/recomendacao-produto.fixture.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as {
    contexto: { produtoId: string };
    produtos: {
      id: string;
      categoriaId: string;
      ativo: boolean;
      quantidadeEstoque: number;
      quantidadeVendida: number;
      notaMedia: number;
    }[];
  };
  for (const [index, key] of fixture.produtos
    .map((p) => p.id)
    .sort()
    .entries()) {
    ids.set(
      key,
      `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    );
  }
  contexto = ids.get(fixture.contexto.produtoId) as string;
  for (const [id, papel] of [
    [comprador, "comprador"],
    [outro, "comprador"],
    [artesao, "artesao"],
  ]) {
    await banco.seed.query(
      'INSERT INTO "Usuario" (id,nome,email,"senhaHash",papel) VALUES ($1,$2,$3,$4,$5::"PapelUsuario")',
      [id, "Sintetico", `${id}@teste.origem`, "hash-sintetico", papel],
    );
  }
  await banco.seed.query(
    'INSERT INTO "PerfilArtesao" ("usuarioId","regiaoId") VALUES ($1,$2)',
    [artesao, "regiao-pilar-recife"],
  );
  const outraCategoria = "20000000-0000-4000-8000-000000000002";
  await banco.seed.query(
    'INSERT INTO "Categoria" (id,nome) VALUES ($1,$2),($3,$4)',
    [categoriaId, "Alfa", outraCategoria, "Beta"],
  );
  for (const p of fixture.produtos) {
    const id = ids.get(p.id);
    await banco.seed.query(
      'INSERT INTO "Produto" (id,nome,descricao,preco,"artesaoId","categoriaId","tecnicaId","quantidadeEstoque",ativo) VALUES ($1,$2,$3,10,$4,$5,$6,$7,$8)',
      [
        id,
        p.id,
        "Sintetico",
        artesao,
        p.categoriaId.endsWith("alfa") ? categoriaId : outraCategoria,
        "tecnica-modelagem-argila",
        p.quantidadeEstoque,
        p.ativo,
      ],
    );
    if (p.quantidadeVendida) {
      const pedido = randomUUID();
      await banco.seed.query(
        'INSERT INTO "Pedido" (id,"compradorId",status) VALUES ($1,$2,\'pendente\')',
        [pedido, outro],
      );
      await banco.seed.query(
        'INSERT INTO "ItemPedido" (id,"pedidoId","produtoId",quantidade) VALUES ($1,$2,$3,$4)',
        [randomUUID(), pedido, id, p.quantidadeVendida],
      );
    }
    const notas = p.notaMedia === 4.8 ? [4, 5, 5, 5, 5] : [p.notaMedia];
    for (const [index, nota] of notas.entries()) {
      const avaliador = `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
      await banco.seed.query(
        'INSERT INTO "Usuario" (id,nome,email,"senhaHash") VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
        [avaliador, "Sintetico", `${avaliador}@teste.origem`, "hash-sintetico"],
      );
      await banco.seed.query(
        'INSERT INTO "Avaliacao" (id,"compradorId","produtoId",nota) VALUES ($1,$2,$3,$4)',
        [randomUUID(), avaliador, id, nota],
      );
    }
  }
  const pedido = randomUUID();
  await banco.seed.query(
    'INSERT INTO "Pedido" (id,"compradorId",status) VALUES ($1,$2,\'confirmado\')',
    [pedido, comprador],
  );
  await banco.seed.query(
    'INSERT INTO "ItemPedido" (id,"pedidoId","produtoId",quantidade) VALUES ($1,$2,$3,1)',
    [randomUUID(), pedido, contexto],
  );
  repo = new PgRecomendacaoRepository(banco.rec, banco.options.apiSchema);
  categoria = new CategoriaRecomendacaoStrategy(repo);
  historico = new HistoricoCompraRecomendacaoStrategy(repo);
  app = createApp(banco.rec, {
    API_SCHEMA: banco.options.apiSchema,
    RECOMENDACAO_SERVICE_TOKEN: token,
  });
  const root = new URL("../../../../backend/", import.meta.url);
  const factory = (await import(
    new URL("src/database/prisma/client.ts", root).href
  )) as {
    createPrismaClient: (url: string) => { $disconnect: () => Promise<void> };
  };
  const backendRepo = (await import(
    new URL("src/repositories/recomendacao.repository.ts", root).href
  )) as { PrismaRecomendacaoRepository: new (db: unknown) => unknown };
  const backendCategoria = (await import(
    new URL(
      "src/integrations/recommendation/categoria-recomendacao.strategy.ts",
      root,
    ).href
  )) as {
    CategoriaRecomendacaoStrategy: new (
      repo: unknown,
      regional?: boolean,
    ) => RecomendacaoStrategy;
  };
  const backendHistorico = (await import(
    new URL(
      "src/integrations/recommendation/historico-compra-recomendacao.strategy.ts",
      root,
    ).href
  )) as {
    HistoricoCompraRecomendacaoStrategy: new (
      repo: unknown,
    ) => RecomendacaoStrategy;
  };
  const prisma = factory.createPrismaClient(banco.adminUrl);
  const referencia = new backendRepo.PrismaRecomendacaoRepository(prisma);
  original = new backendCategoria.CategoriaRecomendacaoStrategy(referencia);
  originalRegional = new backendCategoria.CategoriaRecomendacaoStrategy(
    referencia,
    true,
  );
  originalHistorico = new backendHistorico.HistoricoCompraRecomendacaoStrategy(
    referencia,
  );
  desconectar = () => prisma.$disconnect();
}, 120_000);

afterAll(async () => {
  await desconectar?.();
  if (banco) await banco.fechar();
}, 60_000);

it("reproduz IDs e ordem da fixture interna e do backend", async () => {
  const fixture = JSON.parse(
    await readFile(
      new URL(
        "../../../../fixtures/recomendacao-selecao.fixture.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as unknown;
  const response = await request(app)
    .get("/recomendacoes")
    .query({ produtoId: contexto })
    .set("X-Service-Token", token);
  expect(response.status).toBe(200);
  expect(response.body).toEqual(fixture);
  expect(response.body).toEqual(await original.obter({ produtoId: contexto }));
});

it("mantem fallback, contexto ausente e exclusoes iguais ao backend", async () => {
  for (const contexto of [
    {},
    { produtoId: randomUUID() },
    { usuarioId: comprador },
  ]) {
    expect(await categoria.obter(contexto)).toEqual(
      await original.obter(contexto),
    );
  }
  expect((await categoria.obter({})).produtoIds).toHaveLength(8);
});

it("mantem historico confirmado, exclusao de compras e fallback pessoal", async () => {
  for (const usuarioId of [comprador, outro, randomUUID()]) {
    expect(await historico.obter({ usuarioId })).toEqual(
      await originalHistorico.obter({ usuarioId }),
    );
  }
  const result = await historico.obter({ usuarioId: comprador });
  expect(result.estrategia).toBe("historico-compra");
  expect(result.produtoIds).not.toContain(contexto);
  expect(result.produtoIds).toHaveLength(8);
});

it("mantem fallback quando a categoria do contexto nao possui candidatos", async () => {
  const isolada = randomUUID();
  const produto = randomUUID();
  await banco.seed.query('INSERT INTO "Categoria" (id,nome) VALUES ($1,$2)', [
    isolada,
    isolada,
  ]);
  await banco.seed.query(
    'INSERT INTO "Produto" (id,nome,descricao,preco,"artesaoId","categoriaId","tecnicaId","quantidadeEstoque") VALUES ($1,$2,$3,10,$4,$5,$6,1)',
    [
      produto,
      "Isolado",
      "Sintetico",
      artesao,
      isolada,
      "tecnica-modelagem-argila",
    ],
  );
  const result = await categoria.obter({ produtoId: produto });
  expect(result).toEqual(await original.obter({ produtoId: produto }));
  expect(result.estrategia).toBe("fallback-geral");
  expect(result.produtoIds).not.toContain(produto);
});

it("preserva historico de produtos ocultos e os filtros distintos por Strategy", async () => {
  const candidato = ids.get("produto-fixture-p01");
  await banco.seed.query('UPDATE "Produto" SET ativo=false WHERE id=$1', [
    contexto,
  ]);
  await banco.seed.query(
    'UPDATE "Produto" SET "desativadoPorAdmin"=true WHERE id=$1',
    [candidato],
  );
  try {
    const pessoal = await historico.obter({ usuarioId: comprador });
    expect(pessoal).toEqual(
      await originalHistorico.obter({ usuarioId: comprador }),
    );
    expect(pessoal.estrategia).toBe("historico-compra");
    expect(pessoal.produtoIds).not.toContain(candidato);
    const porCategoria = await categoria.obter({ produtoId: contexto });
    expect(porCategoria).toEqual(await original.obter({ produtoId: contexto }));
    expect(porCategoria.produtoIds[0]).toBe(candidato);
  } finally {
    await banco.seed.query('UPDATE "Produto" SET ativo=true WHERE id=$1', [
      contexto,
    ]);
    await banco.seed.query(
      'UPDATE "Produto" SET "desativadoPorAdmin"=false WHERE id=$1',
      [candidato],
    );
  }
});

it("preserva reforco regional com vendas invertidas entre regioes", async () => {
  const id = ids.get("produto-fixture-p01");
  const artesaoOutra = randomUUID();
  await banco.seed.query(
    'INSERT INTO "Usuario" (id,nome,email,"senhaHash",papel) VALUES ($1,$2,$3,$4,\'artesao\')',
    [artesaoOutra, "Outro", `${artesaoOutra}@teste.origem`, "hash-sintetico"],
  );
  await banco.seed.query(
    'INSERT INTO "PerfilArtesao" ("usuarioId","regiaoId") VALUES ($1,$2)',
    [artesaoOutra, "regiao-alto-moura-caruaru"],
  );
  await banco.seed.query('UPDATE "Produto" SET "artesaoId"=$1 WHERE id=$2', [
    artesaoOutra,
    id,
  ]);
  try {
    const regional = new CategoriaRecomendacaoStrategy(repo, true);
    const result = await regional.obter({ produtoId: contexto });
    expect(result).toEqual(
      await originalRegional.obter({ produtoId: contexto }),
    );
    expect(result.produtoIds[0]).not.toBe(id);
    expect((await categoria.obter({ produtoId: contexto })).produtoIds[0]).toBe(
      id,
    );
  } finally {
    await banco.seed.query('UPDATE "Produto" SET "artesaoId"=$1 WHERE id=$2', [
      artesao,
      id,
    ]);
  }
});

it("preserva colunas exatas e usa views do dono da API", async () => {
  const result = await banco.rec.query<{
    table_name: string;
    column_name: string;
  }>(
    `SELECT table_name,column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name IN ('rec_produtos_elegiveis','rec_compras_confirmadas') ORDER BY table_name,ordinal_position`,
    [banco.options.apiSchema],
  );
  expect(result.rows).toEqual([
    ...["compradorId", "produtoId"].map((column_name) => ({
      table_name: "rec_compras_confirmadas",
      column_name,
    })),
    ...[
      "id",
      "categoriaId",
      "regiaoId",
      "vendas",
      "notaMedia",
      "elegivel",
      "visivel",
    ].map((column_name) => ({
      table_name: "rec_produtos_elegiveis",
      column_name,
    })),
  ]);
});

it("permite SELECT nas duas views", async () => {
  for (const view of ["rec_produtos_elegiveis", "rec_compras_confirmadas"]) {
    expect(
      (
        await banco.rec.query(
          `SELECT * FROM ${escapeIdentifier(banco.options.apiSchema)}.${view}`,
        )
      ).rows.length,
    ).toBeGreaterThan(0);
  }
});

it.each(["Produto", "Pedido", "Usuario"])(
  "nega SELECT, INSERT e UPDATE em %s",
  async (table) => {
    const name = `${escapeIdentifier(banco.options.apiSchema)}.${escapeIdentifier(table)}`;
    for (const sql of [
      `SELECT * FROM ${name}`,
      `INSERT INTO ${name} (id) VALUES ('${randomUUID()}')`,
      `UPDATE ${name} SET id=id WHERE false`,
    ]) {
      await expect(banco.rec.query(sql)).rejects.toMatchObject({
        code: "42501",
      });
    }
  },
);

it("permite INSERT privado e nega SELECT privado pela conexao da API", async () => {
  const name = `${escapeIdentifier(banco.options.recSchema)}.execucao_lote`;
  await banco.rec.query(
    `INSERT INTO ${name} (id,concorrencia,"reforcoRegional") VALUES ($1,1,false)`,
    [randomUUID()],
  );
  expect((await banco.rec.query(`SELECT * FROM ${name}`)).rows).toHaveLength(1);
  await expect(banco.api.query(`SELECT * FROM ${name}`)).rejects.toMatchObject({
    code: "42501",
  });
  await expect(
    banco.api.query(`SET ROLE ${escapeIdentifier(banco.options.recRole)}`),
  ).rejects.toMatchObject({ code: "42501" });
  const flags = await banco.api.query<{ restrito: boolean }>(
    "SELECT NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls OR rolreplication) AS restrito FROM pg_roles WHERE rolname=current_user",
  );
  expect(flags.rows[0]?.restrito).toBe(true);
});

it("recusa bootstrap com papel privilegiado ou identificador malicioso", async () => {
  const {
    rows: [identity],
  } = await banco.admin.query<{ name: string }>("SELECT current_user AS name");
  await expect(
    bootstrapPermissoes(banco.admin, {
      ...banco.options,
      apiRole: identity?.name as string,
    }),
  ).rejects.toThrow("Administrative connection required");
  await banco.admin.query(
    `ALTER ROLE ${escapeIdentifier(banco.options.apiRole)} CREATEROLE`,
  );
  try {
    await expect(
      bootstrapPermissoes(banco.admin, banco.options),
    ).rejects.toThrow("Runtime role has administrative privileges");
  } finally {
    await banco.admin.query(
      `ALTER ROLE ${escapeIdentifier(banco.options.apiRole)} NOCREATEROLE`,
    );
  }
  await expect(
    bootstrapPermissoes(banco.admin, {
      ...banco.options,
      recSchema: "public; DROP SCHEMA public",
    }),
  ).rejects.toThrow();
  expect(
    (
      await banco.rec.query(
        `SELECT count(*) FROM ${escapeIdentifier(banco.options.apiSchema)}.rec_produtos_elegiveis`,
      )
    ).rows[0],
  ).toBeDefined();
});

it("recusa migrations pela conexao da API", async () => {
  await expect(migrate(banco.api, banco.options.recSchema)).rejects.toThrow(
    "Migrations require the private schema owner",
  );
});

it("transfere somente a fila explicitamente autorizada sem perder dados", async () => {
  const queueSchema = `${banco.options.apiSchema}_q`;
  const name = escapeIdentifier(queueSchema);
  await banco.admin.query(`CREATE SCHEMA ${name}`);
  try {
    await banco.admin.query(
      `CREATE TABLE ${name}.job (id integer PRIMARY KEY); INSERT INTO ${name}.job VALUES (1); CREATE SEQUENCE ${name}.contador; CREATE FUNCTION ${name}.contar() RETURNS bigint LANGUAGE sql AS 'SELECT count(*) FROM ${name}.job'`,
    );
    await expect(
      bootstrapPermissoes(banco.admin, { ...banco.options, queueSchema }),
    ).rejects.toThrow("Queue schema needs explicit ownership transfer");
    await bootstrapPermissoes(banco.admin, {
      ...banco.options,
      queueSchema,
      transferQueueOwnership: true,
    });
    expect(
      (await banco.api.query(`SELECT ${name}.contar() AS total`)).rows[0],
    ).toEqual({ total: "1" });
    await banco.api.query(`INSERT INTO ${name}.job VALUES (2)`);
    await expect(
      banco.rec.query(`SELECT * FROM ${name}.job`),
    ).rejects.toMatchObject({ code: "42501" });
  } finally {
    const {
      rows: [identity],
    } = await banco.admin.query<{ name: string }>(
      "SELECT current_user AS name",
    );
    if (identity) {
      await banco.admin.query(
        `GRANT ${escapeIdentifier(banco.options.apiRole)} TO ${escapeIdentifier(identity.name)} WITH SET TRUE, INHERIT TRUE`,
      );
      await banco.admin.query(`DROP SCHEMA ${name} CASCADE`);
    }
  }
}, 30_000);

it("bootstrap e migrations sao idempotentes e preservam dados", async () => {
  await bootstrapPermissoes(banco.admin, banco.options);
  await migrate(banco.rec, banco.options.recSchema);
  expect(
    (
      await banco.rec.query(
        `SELECT * FROM ${escapeIdentifier(banco.options.recSchema)}.execucao_lote`,
      )
    ).rows,
  ).toHaveLength(1);
});

it("detecta checksum divergente antes de reaplicar migration privada", async () => {
  const table = `${escapeIdentifier(banco.options.recSchema)}.schema_migrations`;
  const {
    rows: [original],
  } = await banco.rec.query<{ checksum: string }>(
    `SELECT checksum FROM ${table} WHERE nome='001_execucao_lote.sql'`,
  );
  await banco.rec.query(
    `UPDATE ${table} SET checksum='divergente' WHERE nome='001_execucao_lote.sql'`,
  );
  try {
    await expect(migrate(banco.rec, banco.options.recSchema)).rejects.toThrow(
      "Applied migration checksum changed",
    );
  } finally {
    await banco.rec.query(
      `UPDATE ${table} SET checksum=$1 WHERE nome='001_execucao_lote.sql'`,
      [original?.checksum],
    );
  }
});

it("remove tambem privilegios antigos concedidos por coluna", async () => {
  const table = `${escapeIdentifier(banco.options.apiSchema)}."Produto"`;
  await banco.admin.query(
    `GRANT SELECT (id) ON ${table} TO ${escapeIdentifier(banco.options.recRole)}`,
  );
  expect(
    (await banco.rec.query(`SELECT id FROM ${table} LIMIT 1`)).rowCount,
  ).toBe(1);
  await bootstrapPermissoes(banco.admin, banco.options);
  await expect(
    banco.rec.query(`SELECT id FROM ${table}`),
  ).rejects.toMatchObject({ code: "42501" });
});

it("executa o bloco SQL manual com as mesmas restricoes do bootstrap", async () => {
  const sql = await readFile(
    new URL("../../sql/bootstrap-permissoes.sql", import.meta.url),
    "utf8",
  );
  const body = sql.match(/DO \$bootstrap\$[\s\S]*?\$bootstrap\$;/)?.[0];
  if (!body) throw new Error("Bloco executavel do bootstrap SQL ausente");
  const client = await banco.admin.connect();
  try {
    await client.query("BEGIN");
    const settings = {
      api_schema: banco.options.apiSchema,
      rec_schema: banco.options.recSchema,
      api_role: banco.options.apiRole,
      rec_role: banco.options.recRole,
      rec_password: banco.options.recPassword,
      api_password: banco.options.apiPassword as string,
      queue_schema: "",
      transfer_queue: "false",
    };
    for (const [key, value] of Object.entries(settings))
      await client.query("SELECT set_config($1,$2,true)", [
        `rec_bootstrap.${key}`,
        value,
      ]);
    await client.query(body);
    const {
      rows: [privileges],
    } = await client.query<{
      api_private: boolean;
      rec_table: boolean;
      rec_view: boolean;
    }>(
      "SELECT has_schema_privilege($1,$2,'USAGE') AS api_private,has_table_privilege($3,$4,'SELECT') AS rec_table,has_table_privilege($3,$5,'SELECT') AS rec_view",
      [
        banco.options.apiRole,
        banco.options.recSchema,
        banco.options.recRole,
        `${escapeIdentifier(banco.options.apiSchema)}."Produto"`,
        `${escapeIdentifier(banco.options.apiSchema)}.rec_produtos_elegiveis`,
      ],
    );
    expect(privileges).toEqual({
      api_private: false,
      rec_table: false,
      rec_view: true,
    });
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
});

it.each([undefined, "errado", "x".repeat(5000), token + "x"])(
  "nega token ausente ou errado",
  async (value) => {
    const call = request(app).get("/recomendacoes");
    if (value) call.set("X-Service-Token", value);
    const result = await call;
    expect(result.status).toBe(401);
    expect(result.body).toEqual({ codigo: "TOKEN_SERVICO_INVALIDO" });
  },
);

it("autentica antes de interpretar JSON e protege historico e rotas desconhecidas", async () => {
  for (const path of ["/recomendacoes/historico", "/desconhecida"]) {
    expect((await request(app).get(path)).status).toBe(401);
  }
  const malformed = await request(app)
    .get("/recomendacoes")
    .set("Content-Type", "application/json")
    .send("{");
  expect(malformed.status).toBe(401);
  const authorized = await request(app)
    .get("/recomendacoes")
    .set("X-Service-Token", token)
    .set("Content-Type", "application/json")
    .send("{");
  expect(authorized.status).toBe(400);
  const large = await request(app)
    .get("/recomendacoes")
    .set("X-Service-Token", token)
    .send({ value: "x".repeat(5000) });
  expect(large.status).toBe(413);
});

it.each([
  "/recomendacoes?produtoId=invalido",
  "/recomendacoes?limite=0",
  "/recomendacoes?limite=9",
  "/recomendacoes?limite=1.5",
  "/recomendacoes?limite=",
  "/recomendacoes?extra=1",
  "/recomendacoes/historico",
  "/recomendacoes/historico?usuarioId=invalido",
  "/recomendacoes?limite=1&limite=2",
])("valida query estrita: %s", async (url) => {
  expect(
    (await request(app).get(url).set("X-Service-Token", token)).status,
  ).toBe(400);
});

it("responde historico interno autenticado e respeita limite", async () => {
  const result = await request(app)
    .get("/recomendacoes/historico")
    .query({ usuarioId: comprador, limite: 2 })
    .set("X-Service-Token", token);
  expect(result.status).toBe(200);
  const esperado = await historico.obter({ usuarioId: comprador });
  expect(result.body).toEqual({
    ...esperado,
    produtoIds: esperado.produtoIds.slice(0, 2),
  });
});

it("health consulta PostgreSQL sem token", async () => {
  const result = await request(app).get("/health");
  expect(result.status).toBe(200);
  expect(result.body).toEqual({ status: "ok" });
});

it("banco indisponivel responde 503 sem detalhes", async () => {
  const { Pool } = await import("pg");
  const pool = new Pool({
    connectionString: "postgresql://ficticio:ficticio@127.0.0.1:1/inexistente",
    connectionTimeoutMillis: 100,
  });
  try {
    const unavailable = createApp(pool, {
      API_SCHEMA: "public",
      RECOMENDACAO_SERVICE_TOKEN: token,
    });
    for (const path of ["/health", "/recomendacoes"]) {
      const result = await request(unavailable)
        .get(path)
        .set("X-Service-Token", token);
      expect(result.status).toBe(503);
      expect(result.text).not.toMatch(/postgres|ficticio|ECONN|SELECT|stack/);
    }
  } finally {
    await pool.end();
  }
});

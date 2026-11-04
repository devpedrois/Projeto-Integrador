import "dotenv/config";
import { pathToFileURL } from "node:url";
import { Pool, escapeIdentifier as ident, escapeLiteral } from "pg";
import type { PoolClient } from "pg";
import { z } from "zod";
import { postgresUrl, schemaName } from "../src/config/environment.js";

export interface BootstrapOptions {
  apiSchema: string;
  recSchema: string;
  recRole: string;
  recPassword: string;
  apiRole: string;
  apiPassword?: string;
  queueSchema?: string;
  transferQueueOwnership?: boolean;
}

const optionsSchema = z
  .object({
    apiSchema: schemaName,
    recSchema: schemaName,
    recRole: schemaName,
    apiRole: schemaName,
    recPassword: z.string().min(32),
    apiPassword: z.string().min(32).optional(),
    queueSchema: schemaName.optional(),
    transferQueueOwnership: z.boolean().default(false),
  })
  .refine(
    (v) =>
      v.apiSchema !== v.recSchema &&
      v.apiRole !== v.recRole &&
      v.queueSchema !== v.recSchema &&
      v.queueSchema !== v.apiSchema,
  );

async function ensureRole(client: PoolClient, role: string, password: string) {
  const existing = await client.query<{ unsafe: boolean }>(
    `
    SELECT (rolsuper OR rolcreaterole OR rolcreatedb OR rolbypassrls OR rolreplication
      OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member = r.oid)) AS unsafe
    FROM pg_roles r WHERE rolname = $1
  `,
    [role],
  );
  if (existing.rows[0]?.unsafe)
    throw new Error(
      "Runtime role has administrative privileges or inherited roles",
    );
  if (existing.rowCount) {
    await client.query(
      `ALTER ROLE ${ident(role)} LOGIN PASSWORD ${escapeLiteral(password)}`,
    );
  } else {
    await client.query(
      `CREATE ROLE ${ident(role)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${escapeLiteral(password)}`,
    );
  }
}

export async function bootstrapPermissoes(
  pool: Pool,
  input: BootstrapOptions,
): Promise<void> {
  const options = optionsSchema.parse(input);
  const { apiSchema, recSchema, recRole, recPassword, apiRole, apiPassword } =
    options;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `recomendacao-bootstrap:${recRole}`,
    ]);
    const identity = await client.query<{ name: string }>(
      "SELECT current_user AS name",
    );
    const admin = identity.rows[0]?.name;
    if (!admin || [recRole, apiRole].includes(admin))
      throw new Error("Administrative connection required");
    const apiExists = await client.query(
      "SELECT 1 FROM pg_namespace WHERE nspname=$1",
      [apiSchema],
    );
    if (!apiExists.rowCount)
      throw new Error("API migrations must run before bootstrap");
    await ensureRole(client, recRole, recPassword);
    if (apiPassword) await ensureRole(client, apiRole, apiPassword);
    const apiRuntime = await client.query<{ unsafe: boolean }>(
      `
      SELECT (rolsuper OR rolcreaterole OR rolcreatedb OR rolbypassrls OR rolreplication
        OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member = r.oid)) AS unsafe
      FROM pg_roles r WHERE rolname=$1`,
      [apiRole],
    );
    if (!apiRuntime.rowCount || apiRuntime.rows[0]?.unsafe)
      throw new Error("A restricted API role is required");
    await client.query(
      `GRANT ${ident(recRole)} TO ${ident(admin)} WITH SET TRUE, INHERIT TRUE`,
    );
    const schemaOwner = await client.query<{ owner: string }>(
      "SELECT pg_get_userbyid(nspowner) AS owner FROM pg_namespace WHERE nspname=$1",
      [recSchema],
    );
    if (schemaOwner.rowCount && schemaOwner.rows[0]?.owner !== recRole)
      throw new Error("Private schema belongs to another role");
    await client.query(
      `CREATE SCHEMA IF NOT EXISTS ${ident(recSchema)} AUTHORIZATION ${ident(recRole)}`,
    );
    await client.query(
      `REVOKE ALL ON SCHEMA ${ident(recSchema)} FROM PUBLIC, ${ident(apiRole)}`,
    );
    await client.query(
      `REVOKE ALL ON ALL TABLES IN SCHEMA ${ident(recSchema)} FROM PUBLIC, ${ident(apiRole)}`,
    );
    await client.query(
      `REVOKE ALL ON ALL SEQUENCES IN SCHEMA ${ident(recSchema)} FROM PUBLIC, ${ident(apiRole)}`,
    );
    await client.query(
      `REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ${ident(recSchema)} FROM PUBLIC, ${ident(apiRole)}`,
    );
    await client.query(
      `REVOKE ALL ON SCHEMA ${ident(apiSchema)} FROM ${ident(recRole)}`,
    );
    await client.query(
      `GRANT USAGE ON SCHEMA ${ident(apiSchema)} TO ${ident(recRole)}, ${ident(apiRole)}`,
    );
    await client.query(
      `REVOKE ALL ON ALL TABLES IN SCHEMA ${ident(apiSchema)} FROM ${ident(recRole)}`,
    );
    await client.query(
      `REVOKE ALL ON ALL SEQUENCES IN SCHEMA ${ident(apiSchema)} FROM ${ident(recRole)}`,
    );
    await client.query(
      `GRANT SELECT ON ${ident(apiSchema)}.rec_produtos_elegiveis, ${ident(apiSchema)}.rec_compras_confirmadas TO ${ident(recRole)}, ${ident(apiRole)}`,
    );
    const tables = await client.query<{ name: string }>(
      `SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relkind IN ('r','p') AND c.relname <> '_prisma_migrations'`,
      [apiSchema],
    );
    for (const { name } of tables.rows) {
      await client.query(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON ${ident(apiSchema)}.${ident(name)} TO ${ident(apiRole)}`,
      );
      const access = await client.query<{ allowed: boolean }>(
        "SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS allowed",
        [recRole, `${ident(apiSchema)}.${ident(name)}`],
      );
      if (access.rows[0]?.allowed)
        throw new Error(
          "Service role still has access to API tables through ownership or PUBLIC",
        );
    }
    await client.query(
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${ident(apiSchema)} TO ${ident(apiRole)}`,
    );
    await client.query(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${ident(admin)} IN SCHEMA ${ident(apiSchema)} GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${ident(apiRole)}`,
    );
    await client.query(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${ident(admin)} IN SCHEMA ${ident(apiSchema)} GRANT USAGE, SELECT ON SEQUENCES TO ${ident(apiRole)}`,
    );
    if (options.queueSchema) {
      const queueOwner = await client.query<{ owner: string }>(
        "SELECT pg_get_userbyid(nspowner) AS owner FROM pg_namespace WHERE nspname=$1",
        [options.queueSchema],
      );
      if (
        queueOwner.rowCount &&
        queueOwner.rows[0]?.owner !== apiRole &&
        !(options.transferQueueOwnership && queueOwner.rows[0]?.owner === admin)
      )
        throw new Error(
          "Queue schema needs explicit ownership transfer before switching API runtime",
        );
      await client.query(
        `GRANT ${ident(apiRole)} TO ${ident(admin)} WITH SET TRUE, INHERIT TRUE`,
      );
      await client.query(
        `CREATE SCHEMA IF NOT EXISTS ${ident(options.queueSchema)} AUTHORIZATION ${ident(apiRole)}`,
      );
      if (queueOwner.rowCount && queueOwner.rows[0]?.owner !== apiRole) {
        await client.query(
          `GRANT USAGE, CREATE ON SCHEMA ${ident(options.queueSchema)} TO ${ident(apiRole)}`,
        );
        const relations = await client.query<{ name: string; kind: string }>(
          `SELECT c.relname AS name,c.relkind AS kind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relkind IN ('r','p','S','v','m') ORDER BY CASE WHEN c.relkind='S' THEN 1 ELSE 0 END`,
          [options.queueSchema],
        );
        for (const relation of relations.rows) {
          const kind =
            relation.kind === "S"
              ? "SEQUENCE"
              : relation.kind === "v"
                ? "VIEW"
                : relation.kind === "m"
                  ? "MATERIALIZED VIEW"
                  : "TABLE";
          await client.query(
            `ALTER ${kind} ${ident(options.queueSchema)}.${ident(relation.name)} OWNER TO ${ident(apiRole)}`,
          );
        }
        const routines = await client.query<{
          signature: string;
          kind: string;
        }>(
          `SELECT format('%I.%I(%s)',n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) AS signature,CASE WHEN p.prokind='p' THEN 'PROCEDURE' ELSE 'FUNCTION' END AS kind FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=$1`,
          [options.queueSchema],
        );
        for (const routine of routines.rows)
          await client.query(
            `ALTER ${routine.kind} ${routine.signature} OWNER TO ${ident(apiRole)}`,
          );
        await client.query(
          `ALTER SCHEMA ${ident(options.queueSchema)} OWNER TO ${ident(apiRole)}`,
        );
      }
      await client.query(
        `REVOKE ALL ON SCHEMA ${ident(options.queueSchema)} FROM PUBLIC, ${ident(recRole)}`,
      );
      await client.query(
        `GRANT ${ident(apiRole)} TO ${ident(admin)} WITH SET FALSE, INHERIT FALSE`,
      );
    }
    await client.query(`SET LOCAL ROLE ${ident(recRole)}`);
    await client.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA ${ident(recSchema)} REVOKE ALL ON TABLES FROM PUBLIC`,
    );
    await client.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA ${ident(recSchema)} REVOKE ALL ON SEQUENCES FROM PUBLIC`,
    );
    await client.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA ${ident(recSchema)} REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`,
    );
    await client.query("RESET ROLE");
    await client.query(
      `GRANT ${ident(recRole)} TO ${ident(admin)} WITH SET FALSE, INHERIT FALSE`,
    );
    const access = await client.query<{ allowed: boolean }>(
      "SELECT has_schema_privilege($1,$2,'USAGE') AS allowed",
      [apiRole, recSchema],
    );
    if (access.rows[0]?.allowed)
      throw new Error("API role can access private recommendation schema");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const input = z
    .object({
      BOOTSTRAP_DATABASE_URL: postgresUrl,
      RECOMENDACAO_DATABASE_PASSWORD: z.string().min(32),
      API_DATABASE_PASSWORD: z.string().min(32).optional(),
      API_SCHEMA: schemaName.default("public"),
      RECOMENDACAO_SCHEMA: schemaName.default("recomendacao"),
      RECOMENDACAO_DATABASE_ROLE: schemaName.default("recomendacao_app"),
      API_DATABASE_ROLE: schemaName.default("origem_api_app"),
      API_QUEUE_SCHEMA: schemaName.optional(),
      TRANSFERIR_FILA: z.enum(["true", "false"]).default("false"),
    })
    .safeParse(process.env);
  if (!input.success) throw new Error("Invalid bootstrap configuration");
  const env = input.data;
  const pool = new Pool({ connectionString: env.BOOTSTRAP_DATABASE_URL });
  try {
    await bootstrapPermissoes(pool, {
      apiSchema: env.API_SCHEMA,
      recSchema: env.RECOMENDACAO_SCHEMA,
      recRole: env.RECOMENDACAO_DATABASE_ROLE,
      recPassword: env.RECOMENDACAO_DATABASE_PASSWORD,
      apiRole: env.API_DATABASE_ROLE,
      ...(env.API_DATABASE_PASSWORD
        ? { apiPassword: env.API_DATABASE_PASSWORD }
        : {}),
      ...(env.API_QUEUE_SCHEMA ? { queueSchema: env.API_QUEUE_SCHEMA } : {}),
      transferQueueOwnership: env.TRANSFERIR_FILA === "true",
    });
    process.stdout.write("Permissions configured.\n");
  } finally {
    await pool.end();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(() => {
    process.stderr.write(
      "Failed to configure permissions. Check administrative connection and role configuration.\n",
    );
    process.exitCode = 1;
  });
}

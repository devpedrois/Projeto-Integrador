import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { appendFile } from "node:fs/promises";
import type { Express } from "express";
import { Pool, escapeIdentifier as ident } from "pg";
import type { RecomendacaoHttpConfig } from "../../src/integrations/recommendation/http-recomendacao.client.js";

export async function iniciarRecomendacao(options: {
  databaseUrl: string;
  apiSchema: string;
  token?: string;
  logFile?: string;
  id?: string;
}) {
  const root = new URL("../../../services/recomendacao/", import.meta.url);
  const { bootstrapPermissoes } = (await import(
    new URL("scripts/bootstrap-permissoes.ts", root).href
  )) as {
    bootstrapPermissoes: (
      pool: Pool,
      options: {
        apiSchema: string;
        recSchema: string;
        recRole: string;
        recPassword: string;
        apiRole: string;
        apiPassword: string;
      },
    ) => Promise<void>;
  };
  const { migrate } = (await import(
    new URL("scripts/migrate.ts", root).href
  )) as {
    migrate: (pool: Pool, schema: string) => Promise<void>;
  };
  const { createApp } = (await import(new URL("src/app.ts", root).href)) as {
    createApp: (
      pool: Pool,
      environment: { API_SCHEMA: string; RECOMENDACAO_SERVICE_TOKEN: string },
    ) => Express;
  };
  const suffix = options.id ?? randomBytes(12).toString("hex");
  if (!/^[a-f0-9]{24,32}$/.test(suffix))
    throw new Error("Identificador isolado invalido");
  const recSchema = `rec_priv_${suffix}`;
  const recRole = `rec_app_${suffix}`;
  const apiRole = `api_app_${suffix}`;
  const recPassword = randomBytes(32).toString("hex");
  const token = options.token ?? randomBytes(32).toString("hex");
  const admin = new Pool({ connectionString: options.databaseUrl, max: 2 });
  const url = new URL(options.databaseUrl);
  url.username = recRole;
  url.password = recPassword;
  url.searchParams.delete("schema");
  url.searchParams.delete("options");
  const rec = new Pool({ connectionString: url.toString(), max: 2 });
  let bootstrapped = false;
  let stopped = false;
  const app = createApp(rec, {
    API_SCHEMA: options.apiSchema,
    RECOMENDACAO_SERVICE_TOKEN: token,
  });
  const pendingLogs = new Set<Promise<void>>();
  let logError: unknown;
  const server = createServer((request, response) => {
    if (options.logFile)
      response.once("finish", () => {
        const entry = JSON.stringify({
          method: request.method,
          path: new URL(request.url ?? "/", "http://localhost").pathname,
          status: response.statusCode,
        });
        const write = appendFile(options.logFile as string, entry + "\n");
        pendingLogs.add(write);
        void write
          .catch((error: unknown) => {
            logError = error;
          })
          .finally(() => pendingLogs.delete(write));
      });
    app(request, response);
  });
  async function parar() {
    if (stopped) return;
    stopped = true;
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections();
    });
    await Promise.allSettled([...pendingLogs]);
    await rec.end();
    try {
      if (bootstrapped) {
        await limparRecomendacao(admin, suffix);
      }
    } finally {
      await admin.end();
    }
    if (logError) throw new Error("Falha ao gravar log do microsservico");
  }
  try {
    await bootstrapPermissoes(admin, {
      apiSchema: options.apiSchema,
      recSchema,
      recRole,
      recPassword,
      apiRole,
      apiPassword: randomBytes(32).toString("hex"),
    });
    bootstrapped = true;
    await migrate(rec, recSchema);
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Porta ausente");
    const environment: RecomendacaoHttpConfig = {
      RECOMENDACAO_URL: `http://127.0.0.1:${address.port}`,
      RECOMENDACAO_SERVICE_TOKEN: token,
      RECOMENDACAO_TIMEOUT_MS: 5000,
    };
    return { environment, parar, rec, recSchema, recRole, apiRole };
  } catch (error) {
    await parar();
    throw error;
  }
}

export async function limparRecomendacao(admin: Pool, suffix: string) {
  if (!/^[a-f0-9]{24,32}$/.test(suffix))
    throw new Error("Identificador isolado invalido");
  const recSchema = `rec_priv_${suffix}`;
  const roles = [`rec_app_${suffix}`, `api_app_${suffix}`];
  const client = await admin.connect();
  try {
    await client.query("BEGIN");
    const {
      rows: [identity],
    } = await client.query<{ name: string }>("SELECT current_user AS name");
    if (!identity) throw new Error("Administrative identity missing");
    const existing = await client.query<{ rolname: string }>(
      "SELECT rolname FROM pg_roles WHERE rolname = ANY($1::text[])",
      [roles],
    );
    for (const { rolname } of existing.rows)
      await client.query(
        `GRANT ${ident(rolname)} TO ${ident(identity.name)} WITH SET TRUE, INHERIT TRUE`,
      );
    const owner = await client.query<{ name: string }>(
      "SELECT pg_get_userbyid(nspowner) AS name FROM pg_namespace WHERE nspname=$1",
      [recSchema],
    );
    if (owner.rowCount && owner.rows[0]?.name !== roles[0])
      throw new Error("Proprietario do schema diverge da execucao");
    await client.query(`DROP SCHEMA IF EXISTS ${ident(recSchema)} CASCADE`);
    for (const { rolname } of existing.rows) {
      await client.query(`DROP OWNED BY ${ident(rolname)}`);
      await client.query(`DROP ROLE ${ident(rolname)}`);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

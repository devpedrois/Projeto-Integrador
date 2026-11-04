import { randomBytes } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { config } from "dotenv";
import { Pool, escapeIdentifier } from "pg";
import {
  bootstrapPermissoes,
  type BootstrapOptions,
} from "../../scripts/bootstrap-permissoes.js";
import { migrate } from "../../scripts/migrate.js";

config({
  path: new URL("../../../../backend/.env", import.meta.url),
  quiet: true,
});

export async function criarBanco() {
  const connectionString =
    process.env.BOOTSTRAP_DATABASE_URL ?? process.env.DIRECT_URL;
  if (!connectionString)
    throw new Error("BOOTSTRAP_DATABASE_URL required for PostgreSQL tests");
  const suffix = randomBytes(8).toString("hex");
  const options: BootstrapOptions = {
    apiSchema: `rec_api_${suffix}`,
    recSchema: `rec_priv_${suffix}`,
    recRole: `rec_role_${suffix}`,
    apiRole: `api_role_${suffix}`,
    recPassword: randomBytes(32).toString("hex"),
    apiPassword: randomBytes(32).toString("hex"),
  };
  const admin = new Pool({ connectionString, max: 2 });
  const client = await admin.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA ${escapeIdentifier(options.apiSchema)}`);
    await client.query(
      `SET LOCAL search_path TO ${escapeIdentifier(options.apiSchema)}`,
    );
    const root = new URL(
      "../../../../backend/prisma/migrations/",
      import.meta.url,
    );
    for (const migration of (await readdir(root))
      .filter((name) => /^\d/.test(name))
      .sort()) {
      await client.query(
        (await readFile(new URL(`${migration}/migration.sql`, root), "utf8"))
          .replace(/^BEGIN;\s*/, "")
          .replace(/COMMIT;\s*$/, ""),
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  await bootstrapPermissoes(admin, options);
  function runtimeUrl(role: string, password: string) {
    const url = new URL(connectionString as string);
    url.username = role;
    url.password = password;
    url.searchParams.delete("schema");
    url.searchParams.set(
      "options",
      `-c search_path=${options.apiSchema},public`,
    );
    return url.toString();
  }
  const rec = new Pool({
    connectionString: runtimeUrl(options.recRole, options.recPassword),
    max: 2,
  });
  const api = new Pool({
    connectionString: runtimeUrl(
      options.apiRole,
      options.apiPassword as string,
    ),
    max: 2,
  });
  const seed = new Pool({
    connectionString,
    max: 2,
    options: `-c search_path=${options.apiSchema},public`,
  });
  await migrate(rec, options.recSchema);
  return {
    admin,
    seed,
    rec,
    api,
    options,
    adminUrl: (() => {
      const u = new URL(connectionString);
      u.searchParams.set(
        "options",
        `-c search_path=${options.apiSchema},public`,
      );
      return u.toString();
    })(),
    async fechar() {
      await Promise.all([rec.end(), api.end(), seed.end()]);
      const cleanup = await admin.connect();
      try {
        const {
          rows: [identity],
        } = await cleanup.query<{ name: string }>(
          "SELECT current_user AS name",
        );
        if (!identity) throw new Error("Administrative identity missing");
        for (const role of [options.recRole, options.apiRole]) {
          await cleanup.query(
            `GRANT ${escapeIdentifier(role)} TO ${escapeIdentifier(identity.name)} WITH SET TRUE, INHERIT TRUE`,
          );
        }
        await cleanup.query(
          `DROP SCHEMA ${escapeIdentifier(options.recSchema)} CASCADE`,
        );
        await cleanup.query(
          `DROP SCHEMA ${escapeIdentifier(options.apiSchema)} CASCADE`,
        );
        for (const role of [options.recRole, options.apiRole]) {
          await cleanup.query(`DROP OWNED BY ${escapeIdentifier(role)}`);
          await cleanup.query(`DROP ROLE ${escapeIdentifier(role)}`);
        }
      } finally {
        cleanup.release();
        await admin.end();
      }
    },
  };
}

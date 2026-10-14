import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.js";

export async function criarBancoAuth() {
  const schema = `web03_${randomUUID().replaceAll("-", "")}`;
  const pool = new Pool({ connectionString: process.env.DIRECT_URL, max: 2 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET LOCAL search_path TO "${schema}"`);
    const root = new URL("../../prisma/migrations/", import.meta.url);
    for (const migration of readdirSync(root)
      .filter((name) => /^\d/.test(name))
      .sort()) {
      await client.query(
        readFileSync(new URL(`${migration}/migration.sql`, root), "utf8")
          .replace(/^BEGIN;\s*/, "")
          .replace(/COMMIT;\s*$/, ""),
      );
    }
    await client.query(`
      CREATE FUNCTION "${schema}".falhar_especializacao() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM "${schema}"."Usuario"
          WHERE "id" = NEW."usuarioId" AND "nome" = 'Falha transacional'
        ) THEN
          RAISE EXCEPTION 'Falha sintetica no segundo insert';
        END IF;
        RETURN NEW;
      END;
      $$;
      CREATE TRIGGER falhar_carrinho BEFORE INSERT ON "${schema}"."Carrinho"
      FOR EACH ROW EXECUTE FUNCTION "${schema}".falhar_especializacao();
      CREATE TRIGGER falhar_perfil BEFORE INSERT ON "${schema}"."PerfilArtesao"
      FOR EACH ROW EXECUTE FUNCTION "${schema}".falhar_especializacao();
    `);
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
    throw new Error("Falha ao preparar schema isolado WEB-03");
  }
  client.release();
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
  return {
    prisma,
    async fechar() {
      await prisma.$disconnect();
      await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
      await pool.end();
    },
  };
}

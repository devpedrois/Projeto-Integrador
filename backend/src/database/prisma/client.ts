import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../../generated/prisma/client.js";

const conexoes = new WeakMap<PrismaClient, { pool: Pool; schema: string }>();

export function createPrismaClientWithPool(
  pool: Pool,
  schema = "public",
  disposeExternalPool = false,
): PrismaClient {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(schema))
    throw new Error("Schema de conexao invalido");
  const adapter = new PrismaPg(pool, { schema, disposeExternalPool });
  const prisma = new PrismaClient({ adapter });
  conexoes.set(prisma, { pool, schema });
  return prisma;
}

export function obterConexaoPrisma(prisma: PrismaClient) {
  return conexoes.get(prisma);
}

export function createPrismaClient(databaseUrl: string): PrismaClient {
  return createPrismaClientWithPool(
    new Pool({ connectionString: databaseUrl }),
    "public",
    true,
  );
}

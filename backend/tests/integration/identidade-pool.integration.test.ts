import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createPrismaClientWithPool } from "../../src/database/prisma/client.js";
import { PrismaUsuarioRepository } from "../../src/repositories/usuario.repository.js";
import { criarBancoAuth } from "../helpers/auth-database.js";

let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
beforeAll(async () => {
  banco = await criarBancoAuth();
}, 60000);
afterAll(async () => {
  await banco?.fechar();
});

it("encerra o pool proprio mesmo quando identidade e a primeira operacao", async () => {
  const usuario = await banco.prisma.usuario.create({
    data: {
      nome: "Pessoa sintetica",
      email: `${randomUUID()}@origem.test`,
      senhaHash: "hash-sintetico",
      papel: "artesao",
    },
    select: { id: true, nome: true, email: true, papel: true },
  });
  const pool = new Pool(banco.pool.options);
  const prisma = createPrismaClientWithPool(pool, banco.schema, true);
  try {
    expect(
      await new PrismaUsuarioRepository(prisma).buscarIdentidadeAtivaPorId(
        usuario.id,
      ),
    ).toEqual(usuario);
    await prisma.$disconnect();
    expect(pool.ended).toBe(true);
  } finally {
    await prisma.$disconnect();
    if (!pool.ended) await pool.end();
  }
});

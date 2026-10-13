import { randomUUID } from "node:crypto";
import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "../../src/database/prisma/client.js";
import { AppError } from "../../src/errors/app-error.js";
import { PrismaUsuarioRepository } from "../../src/repositories/usuario.repository.js";
import { UsuarioService } from "../../src/services/usuario.service.js";
import { databasePool } from "../helpers/database.js";

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error("DATABASE_URL is required for integration tests");
}

const prisma = createPrismaClient(databaseUrl);
const service = new UsuarioService(new PrismaUsuarioRepository(prisma));
const createdIds: string[] = [];

afterAll(async () => {
  await databasePool.query('DELETE FROM "Usuario" WHERE "id" = ANY($1::uuid[])', [createdIds]);
  await prisma.$disconnect();
  await databasePool.end();
});

describe("UsuarioService.criar", () => {
  it("persists the email trimmed and lowercased", async () => {
    const local = `Normalizado-${randomUUID()}`;
    const usuario = await service.criar({
      nome: "Usuario de teste",
      email: `  ${local}@Teste.ORIGEM `,
      senhaHash: "hash-de-teste",
    });
    createdIds.push(usuario.id);

    const result = await databasePool.query<{ email: string }>(
      'SELECT "email" FROM "Usuario" WHERE "id" = $1',
      [usuario.id],
    );
    expect(result.rows[0]?.email).toBe(`${local.toLowerCase()}@teste.origem`);
    expect(usuario).not.toHaveProperty("senhaHash");
  });

  it("rejects an email that differs from an existing one only by case or spaces", async () => {
    const email = `duplicado-${randomUUID()}@teste.origem`;
    const primeiro = await service.criar({
      nome: "Primeiro usuario",
      email,
      senhaHash: "hash-de-teste",
    });
    createdIds.push(primeiro.id);

    const segundo = service.criar({
      nome: "Segundo usuario",
      email: ` ${email.toUpperCase()} `,
      senhaHash: "hash-de-teste",
    });

    await expect(segundo).rejects.toBeInstanceOf(AppError);
    await expect(segundo).rejects.toMatchObject({ status: 409, code: "EMAIL_JA_CADASTRADO" });
  });
});

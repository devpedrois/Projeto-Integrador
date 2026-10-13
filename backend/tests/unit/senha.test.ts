import { describe, expect, it } from "vitest";
import { gerarHash, compararSenha } from "../../src/utils/senha.js";

describe("senha bcrypt", () => {
  it("gera hash com custo 10 e salt independente", async () => {
    const senha = crypto.randomUUID();
    const primeiro = await gerarHash(senha);
    const segundo = await gerarHash(senha);
    expect(primeiro).toMatch(/^\$2[ab]\$10\$/);
    expect(primeiro).not.toBe(segundo);
    await expect(compararSenha(senha, primeiro)).resolves.toBe(true);
    await expect(compararSenha(crypto.randomUUID(), primeiro)).resolves.toBe(
      false,
    );
  });

  it("rejeita hashes invalidos sem autenticar", async () => {
    await expect(
      compararSenha(crypto.randomUUID(), "hash-invalido"),
    ).resolves.toBe(false);
  });
});

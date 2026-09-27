import { describe, expect, it } from "vitest";
import { ROTULO_PAPEL } from "@/utils/rotulo-papel";

describe("ROTULO_PAPEL", () => {
  it.each([
    ["comprador", "Comprador"],
    ["artesao", "Artesão"],
    ["admin", "Administrador"],
  ] as const)("%s vira %s", (papel, rotulo) => {
    expect(ROTULO_PAPEL[papel]).toBe(rotulo);
  });
});

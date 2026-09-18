import { describe, expect, it } from "vitest";
import { paraUsuarioPublico, type Usuario } from "@/types/usuario";

describe("paraUsuarioPublico", () => {
  it("remove a senha do DTO publico", () => {
    const usuario: Usuario = {
      id: "1",
      nome: "Maria",
      email: "maria@example.com",
      senha: "segredo123",
      papel: "comprador",
      ativo: true,
    };

    const publico = paraUsuarioPublico(usuario);

    expect(publico).toEqual({
      id: "1",
      nome: "Maria",
      email: "maria@example.com",
      papel: "comprador",
      ativo: true,
    });
    expect("senha" in publico).toBe(false);
  });
});

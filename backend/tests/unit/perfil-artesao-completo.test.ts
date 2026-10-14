import { describe, expect, it } from "vitest";
import { verificarPerfilCompleto } from "../../src/domain/perfil-artesao-completo.js";

const perfil = {
  historia: "Producao de ceramica ha tres geracoes.",
  tecnicaId: "tecnica-1",
  regiaoId: "regiao-1",
};
describe("verificarPerfilCompleto", () => {
  it("perfil com todos os campos preenchidos e completo", () => {
    expect(verificarPerfilCompleto(perfil)).toEqual({
      completo: true,
      camposPendentes: [],
    });
  });
  it("perfil sem historia fica incompleto", () => {
    expect(verificarPerfilCompleto({ ...perfil, historia: "   " })).toEqual({
      completo: false,
      camposPendentes: ["historia"],
    });
  });
  it("perfil sem tecnica principal fica incompleto", () => {
    expect(verificarPerfilCompleto({ ...perfil, tecnicaId: "" })).toEqual({
      completo: false,
      camposPendentes: ["tecnicaId"],
    });
  });
  it("perfil sem regiao fica incompleto", () => {
    expect(verificarPerfilCompleto({ ...perfil, regiaoId: "" })).toEqual({
      completo: false,
      camposPendentes: ["regiaoId"],
    });
  });
  it("perfil ausente fica incompleto com todos os campos pendentes", () => {
    expect(verificarPerfilCompleto(null)).toEqual({
      completo: false,
      camposPendentes: ["historia", "tecnicaId", "regiaoId"],
    });
  });
});

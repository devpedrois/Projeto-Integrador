import { describe, expect, it } from "vitest";
import { verificarPerfilCompleto } from "@/domain/perfil-artesao-completo";
import type { PerfilArtesao } from "@/types/perfil-artesao";

function perfil(overrides: Partial<PerfilArtesao> = {}): PerfilArtesao {
  return {
    artesaoId: "artesao-1",
    historia: "Producao de ceramica ha tres geracoes.",
    tecnicaId: "tecnica-1",
    regiaoId: "regiao-1",
    ...overrides,
  };
}

describe("verificarPerfilCompleto", () => {
  it("perfil com todos os campos preenchidos e completo", () => {
    const resultado = verificarPerfilCompleto(perfil());

    expect(resultado.completo).toBe(true);
    expect(resultado.camposPendentes).toEqual([]);
  });

  it("perfil sem historia fica incompleto", () => {
    const resultado = verificarPerfilCompleto(perfil({ historia: "   " }));

    expect(resultado.completo).toBe(false);
    expect(resultado.camposPendentes).toEqual(["historia"]);
  });

  it("perfil sem tecnica principal fica incompleto", () => {
    const resultado = verificarPerfilCompleto(perfil({ tecnicaId: "" }));

    expect(resultado.completo).toBe(false);
    expect(resultado.camposPendentes).toEqual(["tecnicaId"]);
  });

  it("perfil sem regiao fica incompleto", () => {
    const resultado = verificarPerfilCompleto(perfil({ regiaoId: "" }));

    expect(resultado.completo).toBe(false);
    expect(resultado.camposPendentes).toEqual(["regiaoId"]);
  });

  it("foto ausente nao influencia a regra", () => {
    const resultado = verificarPerfilCompleto(perfil({ fotoUrl: undefined }));

    expect(resultado.completo).toBe(true);
  });

  it("perfil ausente fica incompleto com todos os campos pendentes", () => {
    const resultado = verificarPerfilCompleto(null);

    expect(resultado.completo).toBe(false);
    expect(resultado.camposPendentes).toEqual(["historia", "tecnicaId", "regiaoId"]);
  });
});

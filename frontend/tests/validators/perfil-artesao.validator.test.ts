import { describe, expect, it } from "vitest";
import {
  perfilArtesaoValido,
  validarPerfilArtesao,
} from "@/validators/perfil-artesao.validator";
import { TECNICA_IDS } from "@/fake-api/seeds/tecnicas.seed";
import { REGIAO_IDS } from "@/fake-api/seeds/regioes.seed";

const ENTRADA_VALIDA = {
  historia: "Historia com detalhes suficientes sobre a origem da peca.",
  tecnicaId: TECNICA_IDS.marcenariaArtesanal,
  regiaoId: REGIAO_IDS.pilarRecife,
};

describe("validarPerfilArtesao", () => {
  it("nao gera erros para entrada valida", () => {
    const erros = validarPerfilArtesao(ENTRADA_VALIDA);

    expect(perfilArtesaoValido(erros)).toBe(true);
  });

  it("bloqueia historia com mais de 1000 caracteres", () => {
    const erros = validarPerfilArtesao({
      ...ENTRADA_VALIDA,
      historia: "a".repeat(1001),
    });

    expect(erros.historia).toBeDefined();
    expect(perfilArtesaoValido(erros)).toBe(false);
  });

  it("aceita historia com exatamente 1000 caracteres", () => {
    const erros = validarPerfilArtesao({
      ...ENTRADA_VALIDA,
      historia: "a".repeat(1000),
    });

    expect(erros.historia).toBeUndefined();
  });

  it("bloqueia historia vazia", () => {
    const erros = validarPerfilArtesao({ ...ENTRADA_VALIDA, historia: "  " });

    expect(erros.historia).toBeDefined();
  });

  it("bloqueia tecnicaId invalida", () => {
    const erros = validarPerfilArtesao({
      ...ENTRADA_VALIDA,
      tecnicaId: "tecnica-inexistente",
    });

    expect(erros.tecnicaId).toBeDefined();
  });

  it("bloqueia regiaoId invalida", () => {
    const erros = validarPerfilArtesao({
      ...ENTRADA_VALIDA,
      regiaoId: "regiao-inexistente",
    });

    expect(erros.regiaoId).toBeDefined();
  });

  it("aceita fotoUrl ausente", () => {
    const erros = validarPerfilArtesao(ENTRADA_VALIDA);

    expect(erros.fotoUrl).toBeUndefined();
  });

  it("bloqueia fotoUrl em branco quando informada", () => {
    const erros = validarPerfilArtesao({ ...ENTRADA_VALIDA, fotoUrl: "   " });

    expect(erros.fotoUrl).toBeDefined();
  });
});

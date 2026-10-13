import { expect, it } from "vitest";
import { DEMO } from "../../prisma/seeds/demo.js";
import { lerSeedFrontal } from "../helpers/frontend-seeds.js";

it("BD-05 mantem snapshot alinhado aos seeds frontais atuais", () => {
  expect(DEMO.produtos).toEqual(lerSeedFrontal("produtos").PRODUTOS_SEED);
  expect(DEMO.categorias).toEqual(lerSeedFrontal("categorias").CATEGORIAS_SEED);
  expect(DEMO.perfis_artesao).toEqual(
    lerSeedFrontal("perfis-artesao").PERFIS_ARTESAO_SEED,
  );
  expect(DEMO.avaliacoes).toEqual(lerSeedFrontal("avaliacoes").AVALIACOES_SEED);
  const frontais = lerSeedFrontal("usuarios")
    .USUARIOS_SEED as typeof DEMO.usuarios;
  expect(DEMO.usuarios.length).toBe(frontais.length);
  for (const [indice, usuario] of DEMO.usuarios.entries()) {
    const frontal = frontais[indice];
    expect(
      frontal !== undefined &&
        JSON.stringify(usuario) === JSON.stringify(frontal),
    ).toBe(true);
  }
});

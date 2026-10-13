import { describe, expect, it } from "vitest";
import {
  gerarVolume,
  validarVolumeEnvironment,
} from "../../prisma/seeds/volume.js";
import { seedUuid } from "../../prisma/seeds/id.js";

describe("guarda do seed de volume", () => {
  const databaseUrl = "postgresql://teste:teste@ep-teste.neon.tech/origem";
  it("recusa sem opt-in explicito", () => {
    expect(() =>
      validarVolumeEnvironment({ DATABASE_URL: databaseUrl }),
    ).toThrow();
    expect(() =>
      validarVolumeEnvironment({
        DATABASE_URL: databaseUrl,
        ALLOW_VOLUME_SEED: "true",
      }),
    ).toThrow();
  });
  it("recusa o deploy mesmo com opt-in", () => {
    expect(() =>
      validarVolumeEnvironment({
        DATABASE_URL: databaseUrl,
        DATABASE_URL_DEPLOY: databaseUrl,
        ALLOW_VOLUME_SEED: "1",
      }),
    ).toThrow();
  });
  it("recusa o mesmo endpoint com pooler e parametros diferentes", () => {
    expect(() =>
      validarVolumeEnvironment({
        DATABASE_URL:
          databaseUrl.replace("ep-teste", "ep-teste-pooler") +
          "?sslmode=require",
        DATABASE_URL_DEPLOY: databaseUrl,
        ALLOW_VOLUME_SEED: "1",
      }),
    ).toThrow();
  });
  it("aceita branch separada explicitamente autorizada", () => {
    expect(() =>
      validarVolumeEnvironment({
        DATABASE_URL: databaseUrl,
        DATABASE_URL_DEPLOY: databaseUrl.replace("ep-teste", "ep-deploy"),
        ALLOW_VOLUME_SEED: "1",
      }),
    ).not.toThrow();
  });
  it.each([undefined, "", "https://exemplo.test", "postgresql://"])(
    "recusa URL invalida %s",
    (url) => {
      expect(() =>
        validarVolumeEnvironment({
          ALLOW_VOLUME_SEED: "1",
          ...(url === undefined ? {} : { DATABASE_URL: url }),
        }),
      ).toThrow();
    },
  );
});

describe("gerador deterministico", () => {
  it("repete dados, referencias e datas com seed fixa", () => {
    const dados = gerarVolume();
    expect(gerarVolume()).toEqual(dados);
    expect(dados.artesaos).toHaveLength(50);
    expect(dados.compradores).toHaveLength(300);
    expect(dados.produtos).toHaveLength(1000);
    expect(dados.pedidos).toHaveLength(1500);
    expect(new Set(dados.produtos.map((produto) => produto.id)).size).toBe(
      1000,
    );
    expect(
      dados.pedidos.every((pedido) =>
        dados.produtos.some((produto) => produto.id === pedido.produtoId),
      ),
    ).toBe(true);
  });
  it("preserva UUID valido e converte identificadores textuais", () => {
    const uuid = "a0000000-0000-4000-8000-000000000001";
    expect(seedUuid(uuid)).toBe(uuid);
    expect(seedUuid("produto-seed-01")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(seedUuid("produto-seed-01")).toBe(seedUuid("produto-seed-01"));
    expect(seedUuid("produto-seed-02")).not.toBe(seedUuid("produto-seed-01"));
  });
});

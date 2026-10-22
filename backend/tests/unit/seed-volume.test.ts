import { describe, expect, it } from "vitest";
import {
  gerarVolume,
  validarVolumeEnvironment,
} from "../../prisma/seeds/volume.js";
import { seedUuid } from "../../prisma/seeds/id.js";
import { DEMO } from "../../prisma/seeds/demo.js";
import { REGIOES_SEED, TECNICAS_SEED } from "../../prisma/seeds/referencias.js";

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
        pedido.itens.every((item) =>
          dados.produtos.some((produto) => produto.id === item.produtoId),
        ),
      ),
    ).toBe(true);
  });
  it("BD.1 cobre todas as categorias, tecnicas e regioes com produtos", () => {
    const dados = gerarVolume();
    expect(dados.produtos).toHaveLength(1000);
    expect(DEMO.categorias).toHaveLength(6);
    expect(
      new Set(dados.produtos.map((produto) => produto.categoriaId)),
    ).toEqual(
      new Set(DEMO.categorias.map((categoria) => seedUuid(categoria.id))),
    );
    expect(new Set(dados.produtos.map((produto) => produto.tecnicaId))).toEqual(
      new Set(TECNICAS_SEED.map((tecnica) => tecnica.id)),
    );
    const artesaos = new Map(
      dados.artesaos.map((artesao) => [artesao.id, artesao]),
    );
    expect(
      new Set(
        dados.produtos.map(
          (produto) => artesaos.get(produto.artesaoId)?.regiaoId,
        ),
      ),
    ).toEqual(new Set(REGIOES_SEED.map((regiao) => regiao.id)));
  });
  it("BD.1 garante 50 pedidos confirmados e pagos com artesaos distintos", () => {
    const dados = gerarVolume();
    const produtos = new Map(
      dados.produtos.map((produto) => [produto.id, produto]),
    );
    const multiArtesao = dados.pedidos.filter((pedido) => {
      const artesaos = new Set(
        pedido.itens.map((item) => produtos.get(item.produtoId)?.artesaoId),
      );
      return (
        pedido.status === "confirmado" &&
        pedido.pagamento.status === "aprovado" &&
        artesaos.size >= 2
      );
    });
    expect(multiArtesao.length).toBeGreaterThanOrEqual(50);
    for (const pedido of dados.pedidos) {
      expect(pedido.totalCentavos).toBe(
        pedido.itens.reduce((total, item) => total + item.subtotalCentavos, 0),
      );
      expect(pedido.pagamento.valorCentavos).toBe(pedido.totalCentavos);
      expect(pedido.pagamento.metodo).toBe("pix_simulado");
      for (const item of pedido.itens) {
        expect(item.precoCentavos).toBe(
          produtos.get(item.produtoId)?.precoCentavos,
        );
        expect(item.subtotalCentavos).toBe(
          item.precoCentavos * item.quantidade,
        );
      }
    }
  });
  it("BD.1 gera IDs unicos e estaveis para reexecucao sem duplicacao", () => {
    const primeira = gerarVolume();
    const segunda = gerarVolume();
    const colecoes = (dados: ReturnType<typeof gerarVolume>) => [
      dados.artesaos,
      dados.compradores,
      dados.produtos,
      dados.pedidos,
      dados.pedidos.flatMap((pedido) => pedido.itens),
      dados.pedidos.map((pedido) => pedido.pagamento),
    ];
    for (const [indice, registros] of colecoes(primeira).entries()) {
      const ids = registros.map((registro) => registro.id);
      const repetidos = colecoes(segunda)[indice]?.map(
        (registro) => registro.id,
      );
      expect(new Set(ids).size).toBe(registros.length);
      expect(repetidos).toEqual(ids);
      expect(new Set([...ids, ...(repetidos ?? [])]).size).toBe(
        registros.length,
      );
    }
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

import { describe, expect, it } from "vitest";
import {
  parseProdutoQuery,
  serializeProdutoQuery,
} from "@/utils/produto-query-url";
import type { ProdutoQuery } from "@/types/produto-query";

describe("parseProdutoQuery", () => {
  it("le termo e filtros presentes na URL", () => {
    const params = new URLSearchParams(
      "termo=esculpida&categoria=categoria-ceramica-barro&tecnica=tecnica-torno-ceramico&regiao=regiao-pilar-recife"
    );

    expect(parseProdutoQuery(params)).toEqual({
      termo: "esculpida",
      categoriaId: "categoria-ceramica-barro",
      tecnicaId: "tecnica-torno-ceramico",
      regiaoId: "regiao-pilar-recife",
    });
  });

  it("omite campos ausentes da URL", () => {
    const params = new URLSearchParams("categoria=categoria-ceramica-barro");

    expect(parseProdutoQuery(params)).toEqual({
      categoriaId: "categoria-ceramica-barro",
    });
  });

  it("ignora parametros vazios com seguranca", () => {
    const params = new URLSearchParams("termo=&categoria=&tecnica=&regiao=");

    expect(parseProdutoQuery(params)).toEqual({});
  });

  it("ignora parametros desconhecidos com seguranca", () => {
    const params = new URLSearchParams(
      "termo=vaso&pagina=2&ordenar=preco&utm_source=teste"
    );

    expect(parseProdutoQuery(params)).toEqual({ termo: "vaso" });
  });

  it("ignora espacos em branco como se o parametro estivesse vazio", () => {
    const params = new URLSearchParams("termo=%20%20&categoria=cat-1");

    expect(parseProdutoQuery(params)).toEqual({ categoriaId: "cat-1" });
  });
});

describe("serializeProdutoQuery", () => {
  it("gera querystring somente com campos ativos", () => {
    const query: ProdutoQuery = {
      termo: "vaso",
      categoriaId: "categoria-ceramica-barro",
    };

    expect(serializeProdutoQuery(query)).toBe(
      "termo=vaso&categoria=categoria-ceramica-barro"
    );
  });

  it("remove parametros vazios ou ausentes", () => {
    const query: ProdutoQuery = {
      termo: "   ",
      categoriaId: undefined,
      tecnicaId: "",
      regiaoId: "regiao-tracunhaem",
    };

    expect(serializeProdutoQuery(query)).toBe("regiao=regiao-tracunhaem");
  });

  it("retorna string vazia quando nao ha filtro ativo", () => {
    expect(serializeProdutoQuery({})).toBe("");
  });
});

describe("parseProdutoQuery e serializeProdutoQuery", () => {
  it("uma URL copiada reconstroi exatamente o mesmo conjunto de filtros", () => {
    const combinacoes: ProdutoQuery[] = [
      { categoriaId: "categoria-ceramica-barro" },
      { tecnicaId: "tecnica-trancado-fibra" },
      { regiaoId: "regiao-tracunhaem" },
      { categoriaId: "categoria-madeira-entalhada", regiaoId: "regiao-pilar-recife" },
      {
        termo: "renda",
        categoriaId: "categoria-renda-bordado",
        tecnicaId: "tecnica-renda-irlandesa",
      },
    ];

    for (const query of combinacoes) {
      const querystring = serializeProdutoQuery(query);
      const reconstruido = parseProdutoQuery(new URLSearchParams(querystring));
      expect(reconstruido).toEqual(query);
    }
  });
});

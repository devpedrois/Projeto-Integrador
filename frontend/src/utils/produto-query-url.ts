import type { ProdutoQuery } from "@/types/produto-query";

const PARAM_POR_CAMPO: Record<keyof ProdutoQuery, string> = {
  termo: "termo",
  categoriaId: "categoria",
  tecnicaId: "tecnica",
  regiaoId: "regiao",
};

export function parseProdutoQuery(params: URLSearchParams): ProdutoQuery {
  const query: ProdutoQuery = {};

  for (const campo of Object.keys(PARAM_POR_CAMPO) as (keyof ProdutoQuery)[]) {
    const valor = params.get(PARAM_POR_CAMPO[campo]);
    if (valor !== null && valor.trim() !== "") {
      query[campo] = valor;
    }
  }

  return query;
}

export function serializeProdutoQuery(query: ProdutoQuery): string {
  const params = new URLSearchParams();

  for (const campo of Object.keys(PARAM_POR_CAMPO) as (keyof ProdutoQuery)[]) {
    const valor = query[campo];
    if (valor !== undefined && valor.trim() !== "") {
      params.set(PARAM_POR_CAMPO[campo], valor);
    }
  }

  return params.toString();
}

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  parseProdutoQuery,
  serializeProdutoQuery,
} from "@/utils/produto-query-url";
import type { ProdutoQuery } from "@/types/produto-query";

export interface UseFiltrosUrlResultado {
  query: ProdutoQuery;
  atualizar(alteracoes: Partial<ProdutoQuery>): void;
}

export function useFiltrosUrl(): UseFiltrosUrlResultado {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = parseProdutoQuery(searchParams);

  function atualizar(alteracoes: Partial<ProdutoQuery>): void {
    const proxima: ProdutoQuery = { ...query, ...alteracoes };
    const querystring = serializeProdutoQuery(proxima);
    router.push(querystring ? `${pathname}?${querystring}` : pathname, {
      scroll: false,
    });
  }

  return { query, atualizar };
}

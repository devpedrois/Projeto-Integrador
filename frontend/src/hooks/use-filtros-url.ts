"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  parseProdutoQuery,
  serializeProdutoQuery,
} from "@/utils/produto-query-url";
import type { ProdutoQuery } from "@/types/produto-query";

export interface UseFiltrosUrlResultado {
  query: ProdutoQuery;
  atualizar(alteracoes: Partial<ProdutoQuery>): void;
  limpar(): void;
}

export function useFiltrosUrl(): UseFiltrosUrlResultado {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const parametros = searchParams.toString();
  const endereco = parametros ? `${pathname}?${parametros}` : pathname;
  const [query, setQuery] = useState(() => parseProdutoQuery(searchParams));
  const consultaAtual = useRef(query);
  const enderecoObservado = useRef(endereco);
  const navegacoesPendentes = useRef(new Set<string>());

  useEffect(() => {
    if (enderecoObservado.current === endereco) return;
    enderecoObservado.current = endereco;
    if (navegacoesPendentes.current.delete(endereco)) {
      const consultaPendente = serializeProdutoQuery(consultaAtual.current);
      const destinoPendente = consultaPendente
        ? `${pathname}?${consultaPendente}`
        : pathname;
      if (endereco === destinoPendente) navegacoesPendentes.current.clear();
      return;
    }
    navegacoesPendentes.current.clear();
    const consulta = parseProdutoQuery(new URLSearchParams(parametros));
    consultaAtual.current = consulta;
    setQuery(consulta);
  }, [endereco, parametros, pathname]);

  function navegar(proxima: ProdutoQuery): void {
    consultaAtual.current = proxima;
    setQuery(proxima);
    const querystring = serializeProdutoQuery(proxima);
    const destino = querystring ? `${pathname}?${querystring}` : pathname;
    navegacoesPendentes.current.add(destino);
    router.push(destino, { scroll: false });
  }

  function atualizar(alteracoes: Partial<ProdutoQuery>): void {
    navegar({ ...consultaAtual.current, ...alteracoes });
  }

  function limpar(): void {
    navegar({});
  }

  return { query, atualizar, limpar };
}

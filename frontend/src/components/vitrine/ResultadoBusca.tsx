"use client";

import { useBuscaProdutos } from "@/hooks/use-busca-produtos";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { ProdutoQuery } from "@/types/produto-query";

export interface ResultadoBuscaProps {
  service: ProdutosService | null;
  query: ProdutoQuery;
}

export function ResultadoBusca({ service, query }: ResultadoBuscaProps) {
  const estado = useBuscaProdutos(service, query);

  return (
    <section aria-label="Resultado da busca" className="flex flex-col gap-3">
      {estado.status === "carregando" ? (
        <p role="status" className="text-sm text-neutral-600">
          Buscando produtos...
        </p>
      ) : null}

      {estado.status === "erro" ? (
        <p role="alert" className="text-sm text-red-700">
          {estado.mensagem}
        </p>
      ) : null}

      {estado.status === "sucesso" ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {estado.produtos.map((produto) => (
            <li key={produto.id} className="rounded border border-gray-200 p-3">
              <span className="block text-sm font-medium">{produto.nome}</span>
              <span className="block text-sm text-neutral-600">
                R$ {produto.preco.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

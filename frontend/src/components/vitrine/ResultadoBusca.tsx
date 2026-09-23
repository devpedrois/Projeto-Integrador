"use client";

import { useBuscaProdutos } from "@/hooks/use-busca-produtos";
import { ProdutoCard } from "@/components/vitrine/ProdutoCard";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { ProdutoQuery } from "@/types/produto-query";
import type { Produto } from "@/types/produto";

export interface ResultadoBuscaProps {
  service: ProdutosService | null;
  usuariosService?: UsuariosService | null;
  query: ProdutoQuery;
  onLimpar(): void;
  onAdicionarAoCarrinho(produto: Produto): void;
  errosCarrinho: Record<string, string>;
}

export function ResultadoBusca({
  service,
  usuariosService = null,
  query,
  onLimpar,
  onAdicionarAoCarrinho,
  errosCarrinho,
}: ResultadoBuscaProps) {
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

      {estado.status === "vazio" ? (
        <div role="status" aria-label="Nenhum resultado encontrado" className="flex flex-col gap-2">
          <p className="text-sm text-neutral-600">
            Nenhum resultado encontrado para essa busca.
          </p>
          <button
            type="button"
            onClick={onLimpar}
            className="self-start rounded border border-gray-300 p-2 text-sm"
          >
            Limpar filtros
          </button>
        </div>
      ) : null}

      {estado.status === "sucesso" ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {estado.produtos.map((produto) => (
            <ProdutoCard
              key={produto.id}
              produto={produto}
              usuariosService={usuariosService}
              onAdicionarAoCarrinho={onAdicionarAoCarrinho}
              erroCarrinho={errosCarrinho[produto.id]}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

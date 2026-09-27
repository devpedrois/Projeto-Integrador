"use client";

import { useBuscaProdutos } from "@/hooks/use-busca-produtos";
import { ProdutoCard } from "@/components/vitrine/ProdutoCard";
import { Icone } from "@/components/vitrine/Icone";
import {
  CLASSE_ALERTA,
  CLASSE_STATUS,
  CLASSE_VAZIO,
  EsqueletoProdutos,
  IconeVazio,
} from "@/components/vitrine/EsqueletoProdutos";
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
    <section aria-label="Resultado da busca" className="flex flex-col gap-5">
      {estado.status === "carregando" ? (
        <>
          <p role="status" className={CLASSE_STATUS}>
            Buscando produtos...
          </p>
          <EsqueletoProdutos />
        </>
      ) : null}

      {estado.status === "erro" ? (
        <p role="alert" className={CLASSE_ALERTA}>
          <Icone nome="alerta" className="mt-0.5 flex-none" />
          {estado.mensagem}
        </p>
      ) : null}

      {estado.status === "vazio" ? (
        <div role="status" aria-label="Nenhum resultado encontrado" className={CLASSE_VAZIO}>
          <IconeVazio nome="busca" />
          <p className="m-0 max-w-[380px] text-[15px] text-fg-muted">
            Nenhum resultado encontrado para essa busca.
          </p>
          <button
            type="button"
            onClick={onLimpar}
            className="mt-1.5 inline-flex h-[var(--control-h-md)] items-center justify-center rounded-control border border-border-strong bg-surface-card px-5 text-button font-semibold text-fg-strong transition-colors duration-[var(--dur-fast)] ease-out hover:bg-action-secondary-hover active:translate-y-px"
          >
            Limpar filtros
          </button>
        </div>
      ) : null}

      {estado.status === "sucesso" ? (
        <ul className="grid grid-cols-2 gap-[var(--grid-gap)] md:grid-cols-3">
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

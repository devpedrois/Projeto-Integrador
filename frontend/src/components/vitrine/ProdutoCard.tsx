"use client";

import Link from "next/link";
import { Icone } from "@/components/vitrine/Icone";
import { useNomeArtesao } from "@/hooks/use-nome-artesao";
import { fotoUrlSegura } from "@/utils/foto-url-segura";
import { formatarMoeda } from "@/utils/formatar-moeda";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { Produto } from "@/types/produto";

export interface ProdutoCardProps {
  produto: Produto;
  usuariosService?: UsuariosService | null;
  onAdicionarAoCarrinho(produto: Produto): void;
  erroCarrinho?: string;
}

export function ProdutoCard({
  produto,
  usuariosService = null,
  onAdicionarAoCarrinho,
  erroCarrinho,
}: ProdutoCardProps) {
  const nomeArtesao = useNomeArtesao(usuariosService, produto.artesaoId);
  const erroId = `erro-carrinho-${produto.id}`;
  const hrefProduto = `/produto/${produto.id}`;
  const capa = [...produto.fotos].sort((a, b) => a.ordem - b.ordem)[0];
  const capaUrl = fotoUrlSegura(capa?.url);

  return (
    <li className="group flex min-w-0 flex-col gap-3 rounded-card border border-border-subtle bg-surface-card p-3 shadow-card transition-shadow duration-[var(--dur-base)] ease-out hover:shadow-card-hover">
      {capaUrl ? (
        <Link
          href={hrefProduto}
          tabIndex={-1}
          aria-hidden="true"
          className="block aspect-[4/5] overflow-hidden rounded-media bg-linho-100"
        >
          <img
            src={capaUrl}
            alt=""
            className="size-full object-cover transition-transform duration-[var(--dur-slow)] ease-out group-hover:scale-[1.035] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </Link>
      ) : (
        <div aria-hidden="true" className="grid aspect-[4/5] place-items-center rounded-media bg-linho-100 text-fg-subtle">
          <Icone nome="pacote" tamanho={28} className="opacity-75" />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-1 px-0.5">
        <Link
          href={hrefProduto}
          className="block text-base leading-[1.3] font-semibold text-pretty text-fg-strong no-underline hover:text-fg-strong hover:underline"
        >
          {produto.nome}
        </Link>
        <span className="text-body-sm text-fg-muted">
          por{" "}
          <Link
            href={`/artesao/${produto.artesaoId}`}
            className="text-fg-body underline decoration-border-strong hover:text-fg-link-hover"
          >
            {nomeArtesao ?? "Ver perfil do artesao"}
          </Link>
        </span>
        <span className="mt-1.5 block text-price font-bold tracking-tight text-fg-strong tabular-nums">
          {formatarMoeda(produto.preco)}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onAdicionarAoCarrinho(produto)}
        aria-describedby={erroCarrinho ? erroId : undefined}
        className="inline-flex min-h-[var(--control-h-sm)] w-full items-center justify-center gap-1.5 rounded-control border border-border-strong bg-surface-card px-2 py-1.5 text-center text-[13px] leading-tight font-semibold text-balance text-fg-strong sm:gap-2 sm:px-3.5 sm:text-sm transition-colors duration-[var(--dur-fast)] ease-out hover:bg-action-secondary-hover active:translate-y-px"
      >
        <Icone nome="sacola" tamanho={16} className="flex-none" />
        Adicionar ao carrinho
      </button>
      {erroCarrinho ? (
        <p id={erroId} role="alert" className="flex items-start gap-1.5 text-caption text-erro-700">
          <Icone nome="alerta" tamanho={14} className="mt-px flex-none" />
          {erroCarrinho}
        </p>
      ) : null}
    </li>
  );
}

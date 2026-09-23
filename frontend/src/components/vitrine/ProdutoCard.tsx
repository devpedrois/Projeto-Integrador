"use client";

import Link from "next/link";
import { useNomeArtesao } from "@/hooks/use-nome-artesao";
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

  return (
    <li className="flex flex-col gap-2 rounded border border-gray-200 p-3">
      <span className="block text-sm font-medium">{produto.nome}</span>
      <Link
        href={`/artesao/${produto.artesaoId}`}
        className="block text-sm text-neutral-600 underline"
      >
        {nomeArtesao ?? "Ver perfil do artesao"}
      </Link>
      <span className="block text-sm text-neutral-600">R$ {produto.preco.toFixed(2)}</span>
      <button
        type="button"
        onClick={() => onAdicionarAoCarrinho(produto)}
        aria-describedby={erroCarrinho ? erroId : undefined}
        className="self-start rounded border border-gray-300 p-2 text-sm"
      >
        Adicionar ao carrinho
      </button>
      {erroCarrinho ? (
        <p id={erroId} role="alert" className="text-sm text-red-700">
          {erroCarrinho}
        </p>
      ) : null}
    </li>
  );
}

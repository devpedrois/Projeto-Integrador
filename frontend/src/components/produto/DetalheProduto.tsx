"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useDetalheProduto } from "@/hooks/use-detalhe-produto";
import { useNomeArtesao } from "@/hooks/use-nome-artesao";
import { FaixaRecomendacoes } from "@/components/vitrine/FaixaRecomendacoes";
import { fotoUrlSegura } from "@/utils/foto-url-segura";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { AvaliacoesService } from "@/services/contracts/avaliacoes.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { RecomendacoesService } from "@/services/contracts/recomendacoes.contract";
import type { Produto } from "@/types/produto";
import type { ResumoAvaliacoes } from "@/types/avaliacao";
import type { RecomendacaoContexto } from "@/types/recomendacao";

export interface DetalheProdutoProps {
  produtoId: string | null;
  produtosService: ProdutosService | null;
  avaliacoesService: AvaliacoesService | null;
  opcoesFiltroService: OpcoesFiltroService | null;
  usuariosService: UsuariosService | null;
  recomendacoesService: RecomendacoesService | null;
  onAdicionarAoCarrinho(produto: Produto): void;
  erroCarrinho?: string;
  mensagemCarrinho?: string;
}

const ERRO_CARRINHO_ID = "erro-carrinho-detalhe";

function textoEstoque(quantidade: number): string {
  return quantidade === 1 ? "1 disponivel" : `${quantidade} disponiveis`;
}

function textoAvaliacoes({ media, quantidade }: ResumoAvaliacoes): string {
  if (quantidade === 0) return "Sem avaliacoes ainda";
  const rotulo = quantidade === 1 ? "1 avaliacao" : `${quantidade} avaliacoes`;
  return `Nota ${media.toFixed(1)} de 5 (${rotulo})`;
}

export function DetalheProduto({
  produtoId,
  produtosService,
  avaliacoesService,
  opcoesFiltroService,
  usuariosService,
  recomendacoesService,
  onAdicionarAoCarrinho,
  erroCarrinho,
  mensagemCarrinho,
}: DetalheProdutoProps) {
  const { estado, recarregar } = useDetalheProduto(
    produtosService,
    avaliacoesService,
    opcoesFiltroService,
    produtoId
  );
  const produto = estado.status === "sucesso" ? estado.produto : null;
  const nomeArtesao = useNomeArtesao(
    produto ? usuariosService : null,
    produto?.artesaoId ?? ""
  );

  const contextoRecomendacao = useMemo<RecomendacaoContexto | null>(
    () => (produto ? { produtoId: produto.id } : null),
    [produto]
  );

  const fotos = useMemo(
    () =>
      produto
        ? [...produto.fotos]
            .sort((a, b) => a.ordem - b.ordem)
            .map((foto) => fotoUrlSegura(foto.url))
            .filter((url): url is string => url !== null)
        : [],
    [produto]
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6">
      <Link href="/" className="self-start text-sm underline">
        Voltar para a vitrine
      </Link>

      {estado.status === "carregando" ? (
        <p role="status" className="text-sm text-neutral-600">
          Carregando produto...
        </p>
      ) : null}

      {estado.status === "indisponivel" ? (
        <p role="status" className="rounded border border-gray-200 p-4 text-sm text-neutral-700">
          Produto indisponivel ou nao encontrado.
        </p>
      ) : null}

      {estado.status === "erro" ? (
        <div className="flex flex-col gap-3">
          <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {estado.mensagem}
          </p>
          <button
            type="button"
            onClick={recarregar}
            className="min-h-11 min-w-11 self-start rounded border border-gray-300 px-4 py-2 text-sm font-medium"
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      {estado.status === "sucesso" && produto ? (
        <>
          <article className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {fotos.length > 0 ? (
              <ul aria-label="Fotos do produto" className="grid grid-cols-3 gap-2">
                {fotos.map((url, indice) => (
                  <li key={`${url}-${indice}`} className={indice === 0 ? "col-span-3" : undefined}>
                    <img
                      src={url}
                      alt={`${produto.nome}, foto ${indice + 1}`}
                      className="aspect-square w-full rounded border border-gray-200 object-cover"
                    />
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="flex min-w-0 flex-col gap-4">
              <h1 className="break-words text-2xl font-semibold">{produto.nome}</h1>

              <p className="text-sm text-neutral-700">{textoAvaliacoes(estado.resumo)}</p>

              <p className="text-xl font-semibold">R$ {produto.preco.toFixed(2)}</p>

              <p className="text-sm text-neutral-600">
                Estoque: {textoEstoque(produto.quantidadeEstoque)}
              </p>

              <p className="whitespace-pre-line break-words text-sm text-neutral-700">
                {produto.descricao}
              </p>

              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                {estado.categoriaNome ? (
                  <>
                    <dt className="text-neutral-600">Categoria</dt>
                    <dd>{estado.categoriaNome}</dd>
                  </>
                ) : null}
                {estado.tecnicaNome ? (
                  <>
                    <dt className="text-neutral-600">Tecnica</dt>
                    <dd>{estado.tecnicaNome}</dd>
                  </>
                ) : null}
                {estado.regiaoNome ? (
                  <>
                    <dt className="text-neutral-600">Regiao</dt>
                    <dd>{estado.regiaoNome}</dd>
                  </>
                ) : null}
                <dt className="text-neutral-600">Artesao</dt>
                <dd>
                  <Link href={`/artesao/${produto.artesaoId}`} className="underline">
                    {nomeArtesao ?? "Ver perfil do artesao"}
                  </Link>
                </dd>
              </dl>

              <button
                type="button"
                onClick={() => onAdicionarAoCarrinho(produto)}
                aria-describedby={erroCarrinho ? ERRO_CARRINHO_ID : undefined}
                className="min-h-11 w-full rounded border border-gray-300 px-4 py-2 text-sm font-medium sm:w-auto sm:self-start"
              >
                Adicionar ao carrinho
              </button>

              {erroCarrinho ? (
                <p id={ERRO_CARRINHO_ID} role="alert" className="text-sm text-red-700">
                  {erroCarrinho}
                </p>
              ) : null}

              {mensagemCarrinho && !erroCarrinho ? (
                <p role="status" className="text-sm text-green-700">
                  {mensagemCarrinho}
                </p>
              ) : null}
            </div>
          </article>

          <FaixaRecomendacoes service={recomendacoesService} contexto={contextoRecomendacao} />
        </>
      ) : null}
    </div>
  );
}

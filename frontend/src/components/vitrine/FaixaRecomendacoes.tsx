"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { useRecomendacoes } from "@/hooks/use-recomendacoes";
import { Icone } from "@/components/vitrine/Icone";
import {
  CLASSE_ALERTA,
  CLASSE_STATUS,
  EsqueletoCompacto,
} from "@/components/vitrine/EsqueletoProdutos";
import { fotoUrlSegura } from "@/utils/foto-url-segura";
import { formatarMoeda } from "@/utils/formatar-moeda";
import type { RecomendacoesService } from "@/services/contracts/recomendacoes.contract";
import type { RecomendacaoContexto } from "@/types/recomendacao";
import type { Produto } from "@/types/produto";

export interface FaixaRecomendacoesProps {
  service: RecomendacoesService | null;
  contexto: RecomendacaoContexto | null;
  titulo?: string;
  renderizarProduto?: (produto: Produto) => ReactNode;
}

const TRILHO =
  "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pt-0.5 pb-2 sm:mx-0 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:overflow-visible sm:p-0";
const CARROSSEL =
  "grid w-full min-w-0 auto-cols-[260px] grid-flow-col snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pt-1 pb-3 [&>li]:snap-start";

/**
 * Apenas exibe o resultado ja ordenado pelo service. Nenhuma regra de
 * ranking vive aqui: toda ordenacao vem do FakeRecommendationAdapter
 * (AV1) ou, na AV2, do HttpRecommendationAdapter, sem alterar este
 * componente.
 */
export function FaixaRecomendacoes({
  service,
  contexto,
  titulo,
  renderizarProduto,
}: FaixaRecomendacoesProps) {
  const estado = useRecomendacoes(service, contexto);
  const trilho = renderizarProduto ? CARROSSEL : TRILHO;

  return (
    <section
      aria-label={titulo ?? "Recomendacoes de produtos"}
      className="mt-16 flex min-w-0 flex-col gap-4"
    >
      <h2 className="m-0 font-display text-[24px] leading-[1.2] font-semibold tracking-display text-fg-strong sm:text-[30px]">
        {titulo ?? "Recomendado para você"}
      </h2>

      {estado.status === "carregando" ? (
        <>
          <p role="status" className={CLASSE_STATUS}>
            Carregando recomendações...
          </p>
          <div className={trilho}>
            <EsqueletoCompacto />
          </div>
        </>
      ) : null}

      {estado.status === "erro" ? (
        <p role="alert" className={CLASSE_ALERTA}>
          <Icone nome="alerta" className="mt-0.5 flex-none" />
          {estado.mensagem}
        </p>
      ) : null}

      {estado.status === "vazio" ? (
        <p className={CLASSE_STATUS}>
          Nenhuma recomendação disponível no momento.
        </p>
      ) : null}

      {estado.status === "sucesso" ? (
        <ul
          className={trilho}
          tabIndex={renderizarProduto ? 0 : undefined}
          aria-label={renderizarProduto ? titulo : undefined}
        >
          {estado.resultado.itens.map((produto) => {
            if (renderizarProduto)
              return (
                <Fragment key={produto.id}>
                  {renderizarProduto(produto)}
                </Fragment>
              );
            const capa = [...produto.fotos].sort(
              (a, b) => a.ordem - b.ordem,
            )[0];
            const capaUrl = fotoUrlSegura(capa?.url);

            return (
              <li
                key={produto.id}
                className="flex w-[260px] flex-none snap-start items-center gap-3 rounded-md border border-border-subtle bg-surface-card p-2.5 transition-[box-shadow,border-color] duration-[var(--dur-base)] ease-out hover:border-border-default hover:shadow-sm sm:w-auto"
              >
                <span
                  aria-hidden="true"
                  className="grid size-16 flex-none place-items-center overflow-hidden rounded-sm bg-linho-100 text-fg-subtle"
                >
                  {capaUrl ? (
                    <img
                      src={capaUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <Icone nome="pacote" tamanho={20} className="opacity-75" />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Link
                    href={`/produto/${encodeURIComponent(produto.id)}`}
                    className="truncate text-[15px] leading-[1.3] font-semibold text-fg-strong hover:underline"
                  >
                    {produto.nome}
                  </Link>
                  <span className="mt-0.5 text-[15px] font-bold text-fg-strong tabular-nums">
                    {formatarMoeda(produto.preco)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

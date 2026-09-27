"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { obterCarrinhoStore, obterSessionStore } from "@/services/fake/container";
import { useCarrinho } from "@/hooks/use-carrinho";
import { useSessao } from "@/hooks/use-sessao";
import { ServiceError } from "@/services/errors";
import { Icone } from "@/components/vitrine/Icone";
import { CLASSE_STATUS, CLASSE_VAZIO, IconeVazio } from "@/components/vitrine/EsqueletoProdutos";
import type { CartStore } from "@/store/carrinho.store";
import type { SessionStore } from "@/store/sessao.store";

const STORE_INATIVO: SessionStore = {
  getSnapshot: () => null,
  subscribe: () => () => {},
} as unknown as SessionStore;

const BOTAO_SECUNDARIO =
  "inline-flex min-h-[var(--control-h-md)] items-center justify-center rounded-control border border-border-strong bg-surface-card px-4 text-button font-semibold text-fg-strong no-underline transition-colors duration-[var(--dur-fast)] ease-out hover:bg-action-secondary-hover hover:text-fg-strong";

export default function CarrinhoPage() {
  const [sessionStore, setSessionStore] = useState<SessionStore | null>(null);
  const sessao = useSessao(sessionStore ?? STORE_INATIVO);

  useEffect(() => {
    setSessionStore(obterSessionStore());
  }, []);

  const [carrinhoStore, setCarrinhoStore] = useState<CartStore | null>(null);

  useEffect(() => {
    if (!sessionStore) return;
    setCarrinhoStore(obterCarrinhoStore(sessao?.id));
  }, [sessionStore, sessao?.id]);

  if (!carrinhoStore) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1080px] px-4 pt-6 pb-16 sm:px-6 sm:pt-12">
        <p role="status" className={CLASSE_STATUS}>
          Carregando carrinho...
        </p>
      </main>
    );
  }

  return <Carrinho store={carrinhoStore} />;
}

function Carrinho({ store }: { store: CartStore }) {
  const carrinho = useCarrinho(store);
  const [errosQuantidade, setErrosQuantidade] = useState<Record<string, string>>({});

  function alterarQuantidade(produtoId: string, valor: number): void {
    try {
      store.alterarQuantidade(produtoId, valor);
      setErrosQuantidade((atual) => {
        if (!(produtoId in atual)) return atual;
        const resto = { ...atual };
        delete resto[produtoId];
        return resto;
      });
    } catch (excecao) {
      if (excecao instanceof ServiceError) {
        setErrosQuantidade((atual) => ({ ...atual, [produtoId]: excecao.message }));
      } else {
        throw excecao;
      }
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1080px] px-4 pt-6 pb-16 sm:px-6 sm:pt-12 sm:pb-24">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 sm:mb-7">
        <h1 className="m-0 font-display text-[32px] leading-[1.1] font-semibold tracking-display text-fg-strong sm:text-[44px]">
          Seu carrinho
        </h1>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-fg-link no-underline hover:text-fg-link-hover"
        >
          <Icone nome="voltar" />
          Continuar comprando
        </Link>
      </div>

      {carrinho.itens.length === 0 ? (
        <div className={CLASSE_VAZIO}>
          <IconeVazio nome="sacola" />
          <p className="m-0 font-display text-2xl leading-[1.2] font-semibold text-fg-strong">
            Seu carrinho esta vazio.
          </p>
          <Link href="/" className={BOTAO_SECUNDARIO}>
            Ver produtos
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-6">
          <ul className="m-0 flex min-w-0 flex-[1_1_520px] list-none flex-col gap-3 p-0">
            {carrinho.itens.map((item) => {
              const erro = errosQuantidade[item.produtoId];

              return (
                <li
                  key={item.produtoId}
                  className={`flex flex-wrap items-center gap-x-5 gap-y-4 rounded-card border bg-surface-card p-3.5 shadow-card sm:px-5 sm:py-4 ${
                    erro ? "border-erro-500" : "border-border-subtle"
                  }`}
                >
                  <div className="flex min-w-0 flex-[1_1_240px] items-center gap-3.5">
                    <span
                      aria-hidden="true"
                      className="grid size-[60px] flex-none place-items-center rounded-sm bg-linho-100 text-fg-subtle sm:size-[72px]"
                    >
                      <Icone nome="pacote" tamanho={22} className="opacity-75" />
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-base leading-[1.3] font-semibold text-pretty text-fg-strong">
                        {item.nome}
                      </span>
                      <span className="text-body-sm text-fg-muted tabular-nums">
                        R$ {item.precoUnitario.toFixed(2)} cada
                      </span>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-auto items-end justify-between gap-3">
                    <div className="flex w-[92px] flex-none flex-col gap-1 sm:w-[112px]">
                      <label
                        className="text-body-sm font-semibold text-fg-strong"
                        htmlFor={`quantidade-${item.produtoId}`}
                      >
                        Quantidade
                      </label>
                      <input
                        id={`quantidade-${item.produtoId}`}
                        type="number"
                        min={0}
                        step={1}
                        value={item.quantidade}
                        aria-describedby={erro ? `erro-quantidade-${item.produtoId}` : undefined}
                        onChange={(evento) => {
                          const valor = Number(evento.target.value);
                          if (!Number.isInteger(valor) || valor < 0) return;
                          alterarQuantidade(item.produtoId, valor);
                        }}
                        className={`h-[var(--control-h-sm)] w-full rounded-control border bg-surface-card px-3 text-[15px] text-fg-strong tabular-nums shadow-[var(--inset-shadow-xs)] transition-[border-color,box-shadow] duration-[var(--dur-fast)] ease-out focus:border-border-focus focus:shadow-[var(--focus-ring)] focus:outline-none ${
                          erro ? "border-erro-500" : "border-border-input"
                        }`}
                      />
                    </div>
                    <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
                      <span className="text-right text-[17px] font-bold whitespace-nowrap text-fg-strong tabular-nums sm:min-w-24">
                        R$ {(item.precoUnitario * item.quantidade).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => store.remover(item.produtoId)}
                        className="inline-flex min-h-[var(--control-h-sm)] items-center gap-1.5 rounded-control border border-border-strong bg-surface-card px-3 text-body-sm font-semibold text-fg-strong transition-colors duration-[var(--dur-fast)] ease-out hover:bg-action-secondary-hover active:translate-y-px"
                      >
                        <Icone nome="lixeira" tamanho={16} className="flex-none" />
                        Remover
                      </button>
                    </div>
                  </div>
                  {erro ? (
                    <p
                      id={`erro-quantidade-${item.produtoId}`}
                      role="alert"
                      className="m-0 flex flex-[1_1_100%] items-start gap-2 rounded-md bg-erro-50 px-3 py-2.5 text-body-sm leading-[1.45] text-erro-700"
                    >
                      <Icone nome="alerta" tamanho={16} className="mt-0.5 flex-none" />
                      {erro}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <aside className="flex w-full flex-[1_1_300px] flex-col gap-5 rounded-card border border-border-subtle bg-surface-card p-6 shadow-card lg:sticky lg:top-24 lg:max-w-[340px]">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-display text-[22px] font-semibold text-fg-strong">Total</span>
              <span className="text-[26px] font-bold tracking-tight text-fg-strong tabular-nums">
                R$ {carrinho.total.toFixed(2)}
              </span>
            </div>

            <Link
              href="/checkout"
              className="inline-flex min-h-[var(--control-h-lg)] w-full items-center justify-center gap-2 rounded-control bg-action-primary px-6 text-base font-semibold text-fg-on-brand no-underline transition-colors duration-[var(--dur-fast)] ease-out hover:bg-action-primary-hover hover:text-fg-on-brand active:translate-y-px active:bg-action-primary-press"
            >
              Finalizar compra
              <Icone nome="avancar" className="flex-none" />
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}

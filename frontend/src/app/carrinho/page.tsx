"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { obterCarrinhoStore, obterSessionStore } from "@/services/fake/container";
import { useCarrinho } from "@/hooks/use-carrinho";
import { useSessao } from "@/hooks/use-sessao";
import { ServiceError } from "@/services/errors";
import type { CartStore } from "@/store/carrinho.store";
import type { SessionStore } from "@/store/sessao.store";

const STORE_INATIVO: SessionStore = {
  getSnapshot: () => null,
  subscribe: () => () => {},
} as unknown as SessionStore;

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
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
        <p role="status" className="text-sm text-neutral-600">
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
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Seu carrinho</h1>
        <Link href="/" className="text-sm text-neutral-600 underline">
          Continuar comprando
        </Link>
      </div>

      {carrinho.itens.length === 0 ? (
        <div className="flex flex-col gap-3 rounded border border-gray-200 p-6 text-center">
          <p className="text-sm text-neutral-600">Seu carrinho esta vazio.</p>
          <Link
            href="/"
            className="self-center rounded border border-gray-300 p-2 text-sm"
          >
            Ver produtos
          </Link>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {carrinho.itens.map((item) => (
              <li
                key={item.produtoId}
                className="flex flex-col gap-2 rounded border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{item.nome}</span>
                  <span className="text-sm text-neutral-600">
                    R$ {item.precoUnitario.toFixed(2)} cada
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-neutral-600" htmlFor={`quantidade-${item.produtoId}`}>
                    Quantidade
                  </label>
                  <input
                    id={`quantidade-${item.produtoId}`}
                    type="number"
                    min={0}
                    step={1}
                    value={item.quantidade}
                    aria-describedby={
                      errosQuantidade[item.produtoId]
                        ? `erro-quantidade-${item.produtoId}`
                        : undefined
                    }
                    onChange={(evento) => {
                      const valor = Number(evento.target.value);
                      if (!Number.isInteger(valor) || valor < 0) return;
                      alterarQuantidade(item.produtoId, valor);
                    }}
                    className="w-16 rounded border border-gray-300 p-1 text-sm"
                  />
                  <span className="w-24 text-right text-sm font-medium">
                    R$ {(item.precoUnitario * item.quantidade).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => store.remover(item.produtoId)}
                    className="rounded border border-gray-300 p-2 text-sm"
                  >
                    Remover
                  </button>
                </div>
                {errosQuantidade[item.produtoId] ? (
                  <p
                    id={`erro-quantidade-${item.produtoId}`}
                    role="alert"
                    className="text-sm text-red-700"
                  >
                    {errosQuantidade[item.produtoId]}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between border-t border-gray-200 pt-4">
            <span className="text-base font-semibold">Total</span>
            <span className="text-base font-semibold">R$ {carrinho.total.toFixed(2)}</span>
          </div>

          <Link
            href="/checkout"
            className="min-h-11 rounded bg-emerald-700 px-4 py-2 text-center text-sm font-medium text-white"
          >
            Finalizar compra
          </Link>
        </>
      )}
    </main>
  );
}

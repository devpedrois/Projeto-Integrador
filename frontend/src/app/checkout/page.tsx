"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RouteGuard } from "@/components/layout/RouteGuard";
import { useCarrinho } from "@/hooks/use-carrinho";
import { useSessao } from "@/hooks/use-sessao";
import {
  obterCarrinhoStore,
  obterPedidosService,
  obterSessionStore,
} from "@/services/fake/container";
import { ServiceError } from "@/services/errors";
import type { CartStore } from "@/store/carrinho.store";
import type { SessionStore } from "@/store/sessao.store";
import type { PedidosService } from "@/services/contracts/pedidos.contract";
import type { Pedido } from "@/types/pedido";

const STORE_INATIVO: SessionStore = {
  getSnapshot: () => null,
  subscribe: () => () => {},
} as unknown as SessionStore;

export default function CheckoutPage() {
  const [sessionStore, setSessionStore] = useState<SessionStore | null>(null);
  const sessao = useSessao(sessionStore ?? STORE_INATIVO);

  useEffect(() => {
    setSessionStore(obterSessionStore());
  }, []);

  const [carrinhoStore, setCarrinhoStore] = useState<CartStore | null>(null);
  const [pedidosService, setPedidosService] = useState<PedidosService | null>(null);

  useEffect(() => {
    if (!sessionStore) return;
    setCarrinhoStore(obterCarrinhoStore(sessao?.id));
    setPedidosService(obterPedidosService());
  }, [sessionStore, sessao?.id]);

  return (
    <RouteGuard sessionStore={sessionStore}>
      {carrinhoStore && pedidosService && sessao ? (
        <Checkout
          carrinhoStore={carrinhoStore}
          pedidosService={pedidosService}
          compradorId={sessao.id}
        />
      ) : (
        <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
          <p role="status" className="text-sm text-neutral-600">
            Carregando checkout...
          </p>
        </main>
      )}
    </RouteGuard>
  );
}

function Checkout({
  carrinhoStore,
  pedidosService,
  compradorId,
}: {
  carrinhoStore: CartStore;
  pedidosService: PedidosService;
  compradorId: string;
}) {
  const carrinho = useCarrinho(carrinhoStore);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pedidoConfirmado, setPedidoConfirmado] = useState<Pedido | null>(null);

  async function confirmarPedido() {
    if (enviando) return;
    setEnviando(true);
    setErro(null);

    try {
      const pedido = await pedidosService.confirmar(
        carrinho.itens.map((item) => ({
          produtoId: item.produtoId,
          quantidade: item.quantidade,
        })),
        compradorId
      );
      carrinhoStore.limpar();
      setPedidoConfirmado(pedido);
    } catch (excecao) {
      if (excecao instanceof ServiceError) {
        setErro(excecao.message);
      } else {
        setErro("Nao foi possivel concluir o pedido. Tente novamente.");
      }
    } finally {
      setEnviando(false);
    }
  }

  if (pedidoConfirmado) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6 text-center">
        <h1 className="text-2xl font-semibold">Pedido confirmado</h1>
        <p className="text-sm text-neutral-600">
          Numero de confirmacao:{" "}
          <span className="font-mono font-medium">{pedidoConfirmado.numeroConfirmacao}</span>
        </p>
        <Link
          href="/"
          className="self-center rounded border border-gray-300 p-2 text-sm"
        >
          Voltar para a vitrine
        </Link>
      </main>
    );
  }

  if (carrinho.itens.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-6 text-center">
        <p className="text-sm text-neutral-600">Seu carrinho esta vazio.</p>
        <Link
          href="/"
          className="self-center rounded border border-gray-300 p-2 text-sm"
        >
          Ver produtos
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Revisar e confirmar pedido</h1>

      <ul className="flex flex-col gap-3">
        {carrinho.itens.map((item) => (
          <li
            key={item.produtoId}
            className="flex items-center justify-between gap-3 rounded border border-gray-200 p-3"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium">{item.nome}</span>
              <span className="text-sm text-neutral-600">
                {item.quantidade} x R$ {item.precoUnitario.toFixed(2)}
              </span>
            </div>
            <span className="text-sm font-semibold">
              R$ {(item.precoUnitario * item.quantidade).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <span className="text-base font-semibold">Total</span>
        <span className="text-base font-semibold">R$ {carrinho.total.toFixed(2)}</span>
      </div>

      {erro ? (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      ) : null}

      <button
        type="button"
        onClick={confirmarPedido}
        disabled={enviando}
        className="min-h-11 rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {enviando ? "Confirmando..." : "Confirmar pedido"}
      </button>
    </main>
  );
}

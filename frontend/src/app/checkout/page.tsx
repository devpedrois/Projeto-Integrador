"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RouteGuard } from "@/components/layout/RouteGuard";
import { Icone } from "@/components/vitrine/Icone";
import {
  CLASSE_ALERTA,
  CLASSE_STATUS,
  CLASSE_VAZIO,
  IconeVazio,
} from "@/components/vitrine/EsqueletoProdutos";
import { useCarrinho } from "@/hooks/use-carrinho";
import { useSessao } from "@/hooks/use-sessao";
import {
  obterCarrinhoStore,
  obterPedidosService,
  obterSessionStore,
} from "@/services/fake/container";
import { ServiceError } from "@/services/errors";
import { formatarMoeda } from "@/utils/formatar-moeda";
import type { CartStore } from "@/store/carrinho.store";
import type { SessionStore } from "@/store/sessao.store";
import type { PedidosService } from "@/services/contracts/pedidos.contract";
import type { Pedido } from "@/types/pedido";

const STORE_INATIVO: SessionStore = {
  getSnapshot: () => null,
  subscribe: () => () => {},
} as unknown as SessionStore;

const CLASSE_MAIN =
  "mx-auto min-h-screen w-full max-w-[720px] px-4 pt-6 pb-16 sm:px-6 sm:pt-12 sm:pb-24";

const CLASSE_TITULO =
  "m-0 mb-5 font-display text-[30px] leading-[1.1] font-semibold tracking-display text-balance text-fg-strong sm:mb-7 sm:text-[40px]";

const BOTAO_SECUNDARIO =
  "inline-flex min-h-[var(--control-h-md)] items-center justify-center gap-2 rounded-control border border-border-strong bg-surface-card px-4 text-button font-semibold text-fg-strong no-underline transition-colors duration-[var(--dur-fast)] ease-out hover:bg-action-secondary-hover hover:text-fg-strong";

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
        <main className={CLASSE_MAIN}>
          <p role="status" className={CLASSE_STATUS}>
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
        setErro("Não foi possível concluir o pedido. Tente novamente.");
      }
    } finally {
      setEnviando(false);
    }
  }

  if (pedidoConfirmado) {
    return (
      <main className={CLASSE_MAIN}>
        <section className="flex flex-col items-center gap-4 rounded-lg border border-border-subtle bg-surface-card px-5 py-10 text-center shadow-card sm:px-8 sm:py-14">
          <span
            aria-hidden="true"
            className="mb-1 grid h-[98px] w-[84px] place-items-center rounded-[999px_999px_14px_14px] bg-sucesso-50 text-sucesso-700"
          >
            <Icone nome="confirmar" tamanho={36} />
          </span>
          <h1 className="m-0 font-display text-[30px] leading-[1.1] font-semibold tracking-display text-fg-strong sm:text-[40px]">
            Pedido confirmado
          </h1>
          <p className="m-0 text-body text-fg-muted">
            Numero de confirmacao:{" "}
            <span className="rounded-sm bg-linho-100 px-2 py-0.5 font-mono font-semibold text-fg-strong">
              {pedidoConfirmado.numeroConfirmacao}
            </span>
          </p>
          <Link href="/" className={`${BOTAO_SECUNDARIO} mt-2`}>
            <Icone nome="voltar" className="flex-none" />
            Voltar para a vitrine
          </Link>
        </section>
      </main>
    );
  }

  if (carrinho.itens.length === 0) {
    return (
      <main className={CLASSE_MAIN}>
        <div className={CLASSE_VAZIO}>
          <IconeVazio nome="sacola" />
          <p className="m-0 font-display text-2xl leading-[1.2] font-semibold text-fg-strong">
            Seu carrinho está vazio.
          </p>
          <Link href="/" className={BOTAO_SECUNDARIO}>
            Ver produtos
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={CLASSE_MAIN}>
      <h1 className={CLASSE_TITULO}>Revisar e confirmar pedido</h1>

      <div className="flex flex-col gap-5">
        {erro ? (
          <p role="alert" className={CLASSE_ALERTA}>
            <Icone nome="alerta" className="mt-0.5 flex-none" />
            {erro}
          </p>
        ) : null}

        <section className="rounded-card border border-border-subtle bg-surface-card px-4 pt-1 pb-4 shadow-card sm:px-6 sm:pb-5">
          <ul className="m-0 flex list-none flex-col p-0">
            {carrinho.itens.map((item) => (
              <li
                key={item.produtoId}
                className="flex items-center gap-3.5 border-b border-border-subtle py-4"
              >
                <span
                  aria-hidden="true"
                  className="grid size-[52px] flex-none place-items-center rounded-sm bg-linho-100 text-fg-subtle sm:size-16"
                >
                  <Icone nome="pacote" tamanho={20} className="opacity-75" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-base leading-[1.3] font-semibold text-pretty text-fg-strong">
                    {item.nome}
                  </span>
                  <span className="text-body-sm text-fg-muted tabular-nums">
                    {item.quantidade} x {formatarMoeda(item.precoUnitario)}
                  </span>
                </div>
                <span className="flex-none text-base font-bold whitespace-nowrap text-fg-strong tabular-nums">
                  {formatarMoeda(item.precoUnitario * item.quantidade)}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex items-baseline justify-between gap-3 pt-5 pb-1">
            <span className="font-display text-[22px] font-semibold text-fg-strong">Total</span>
            <span className="text-[26px] font-bold tracking-tight text-fg-strong tabular-nums">
              {formatarMoeda(carrinho.total)}
            </span>
          </div>
        </section>

        <button
          type="button"
          onClick={confirmarPedido}
          disabled={enviando}
          className="inline-flex min-h-[var(--control-h-lg)] w-full items-center justify-center gap-2 rounded-control bg-action-primary px-6 text-base font-semibold text-fg-on-brand transition-colors duration-[var(--dur-fast)] ease-out hover:bg-action-primary-hover active:translate-y-px active:bg-action-primary-press disabled:cursor-progress disabled:bg-barro-400 disabled:active:translate-y-0"
        >
          {enviando ? (
            <span
              aria-hidden="true"
              className="size-[18px] flex-none animate-og-spin rounded-pill border-2 border-white/40 border-t-white motion-reduce:animate-none"
            />
          ) : (
            <Icone nome="confirmar" className="flex-none" />
          )}
          {enviando ? "Confirmando..." : "Confirmar pedido"}
        </button>
      </div>
    </main>
  );
}

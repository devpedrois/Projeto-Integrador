"use client";

import { useEstadoCarrinho } from "@/hooks/use-carrinho";
import type { CartStore } from "@/store/carrinho.store";

export function AvisosCarrinho({
  store,
  mostrarErros = true,
}: {
  store: CartStore;
  mostrarErros?: boolean;
}) {
  const estado = useEstadoCarrinho(store);
  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-2 px-4">
      {estado.avisos.map((aviso, indice) => (
        <p
          key={`${indice}-${aviso}`}
          role="status"
          className="my-2 rounded-md bg-linho-100 px-4 py-3 text-body-sm text-fg-strong"
        >
          {aviso}
        </p>
      ))}
      {mostrarErros && estado.erro ? (
        <div
          role="alert"
          className="my-2 rounded-md bg-erro-50 px-4 py-3 text-erro-700"
        >
          <p className="m-0">{estado.erro}</p>
          <button
            type="button"
            disabled={estado.carregando || estado.enviando}
            onClick={() => {
              void store.recarregar().catch(() => {});
            }}
            className="mt-2 underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : null}
    </div>
  );
}

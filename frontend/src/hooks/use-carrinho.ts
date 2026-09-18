"use client";

import { useSyncExternalStore } from "react";
import type { CartStore } from "@/store/carrinho.store";
import type { Carrinho } from "@/types/carrinho";

const CARRINHO_VAZIO: Carrinho = { itens: [], total: 0, atualizadoEm: "" };
const getServerSnapshot = (): Carrinho => CARRINHO_VAZIO;

export function useCarrinho(store: CartStore): Carrinho {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot);
}

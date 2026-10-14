"use client";

import { useSyncExternalStore } from "react";
import type { SessionStore } from "@/store/sessao.store";
import type { UsuarioSessao } from "@/types/sessao";

const getServerSnapshot = () => null;
const getRestaurandoServidor = () => false;

export function useSessao(store: SessionStore): UsuarioSessao | null {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    getServerSnapshot,
  );
}

export function useEstadoSessao(store: SessionStore) {
  const restaurando = useSyncExternalStore(
    store.subscribe,
    store.getRestaurandoSnapshot ?? getRestaurandoServidor,
    getRestaurandoServidor,
  );
  const erro = useSyncExternalStore(
    store.subscribe,
    store.getErroSnapshot ?? getServerSnapshot,
    getServerSnapshot,
  );
  return { restaurando, erro };
}

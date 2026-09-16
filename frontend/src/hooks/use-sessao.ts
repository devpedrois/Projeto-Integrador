"use client";

import { useSyncExternalStore } from "react";
import type { SessionStore } from "@/store/sessao.store";
import type { UsuarioSessao } from "@/types/sessao";

const getServerSnapshot = () => null;

export function useSessao(store: SessionStore): UsuarioSessao | null {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    getServerSnapshot
  );
}

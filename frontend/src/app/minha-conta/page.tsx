"use client";

import { useEffect, useState } from "react";
import { RouteGuard } from "@/components/layout/RouteGuard";
import { ResumoConta } from "@/components/minha-conta/ResumoConta";
import {
  obterPedidosService,
  obterSessionStore,
} from "@/services/fake/container";
import type { SessionStore } from "@/store/sessao.store";
import type { PedidosService } from "@/services/contracts/pedidos.contract";

export default function MinhaContaPage() {
  const [sessionStore, setSessionStore] = useState<SessionStore | null>(null);
  const [pedidosService, setPedidosService] = useState<PedidosService | null>(
    null,
  );

  useEffect(() => {
    setSessionStore(obterSessionStore());
    setPedidosService(obterPedidosService());
  }, []);

  return (
    <RouteGuard sessionStore={sessionStore}>
      {sessionStore ? (
        <ResumoConta
          sessionStore={sessionStore}
          pedidosService={pedidosService}
        />
      ) : null}
    </RouteGuard>
  );
}

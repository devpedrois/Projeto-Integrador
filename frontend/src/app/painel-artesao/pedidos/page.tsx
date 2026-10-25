"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RouteGuard } from "@/components/layout/RouteGuard";
import { PedidosRecebidos } from "@/components/painel-artesao/PedidosRecebidos";
import { BOTAO_SECUNDARIO_PEQUENO } from "@/components/formulario/estilos-botao";
import {
  obterPedidosArtesaoService,
  obterSessionStore,
} from "@/services/fake/container";
import type { PedidosArtesaoService } from "@/services/contracts/pedidos-artesao.contract";
import type { SessionStore } from "@/store/sessao.store";
import { useSessao } from "@/hooks/use-sessao";

const STORE_INATIVO: SessionStore = {
  getSnapshot: () => null,
  subscribe: () => () => {},
} as unknown as SessionStore;

export default function PedidosRecebidosPage() {
  const [sessionStore, setSessionStore] = useState<SessionStore | null>(null);
  const [service, setService] = useState<PedidosArtesaoService | null>(null);
  const sessao = useSessao(sessionStore ?? STORE_INATIVO);
  useEffect(() => {
    setSessionStore(obterSessionStore());
    setService(obterPedidosArtesaoService());
  }, []);
  return (
    <RouteGuard sessionStore={sessionStore} papeisPermitidos={["artesao"]}>
      <main className="mx-auto flex w-full min-w-0 max-w-[1008px] flex-col gap-6 px-[var(--container-pad)] pt-8 pb-20 md:pt-12">
        <Link
          href="/painel-artesao"
          className={`${BOTAO_SECUNDARIO_PEQUENO} self-start`}
        >
          Voltar ao painel
        </Link>
        {service && sessao ? (
          <PedidosRecebidos key={sessao.id} service={service} />
        ) : (
          <p>Pedidos recebidos disponíveis com a API conectada.</p>
        )}
      </main>
    </RouteGuard>
  );
}

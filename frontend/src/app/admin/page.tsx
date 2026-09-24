"use client";

import { useEffect, useState } from "react";
import { RouteGuard } from "@/components/layout/RouteGuard";
import { PainelModeracao } from "@/components/admin/PainelModeracao";
import { useSessao } from "@/hooks/use-sessao";
import {
  obterModeracaoService,
  obterSessionStore,
} from "@/services/fake/container";
import type { ModeracaoService } from "@/services/contracts/moderacao.contract";
import type { SessionStore } from "@/store/sessao.store";

const STORE_INATIVO: SessionStore = {
  getSnapshot: () => null,
  subscribe: () => () => {},
} as unknown as SessionStore;

export default function AdminPage() {
  const [sessionStore, setSessionStore] = useState<SessionStore | null>(null);
  const [moderacaoService, setModeracaoService] = useState<ModeracaoService | null>(
    null
  );

  useEffect(() => {
    setSessionStore(obterSessionStore());
    setModeracaoService(obterModeracaoService());
  }, []);

  const sessao = useSessao(sessionStore ?? STORE_INATIVO);

  return (
    <RouteGuard sessionStore={sessionStore} papeisPermitidos={["admin"]}>
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-4 sm:p-6">
        <h1 className="text-2xl font-semibold">Painel administrativo</h1>
        {moderacaoService && sessao ? (
          <PainelModeracao service={moderacaoService} adminId={sessao.id} />
        ) : null}
      </main>
    </RouteGuard>
  );
}

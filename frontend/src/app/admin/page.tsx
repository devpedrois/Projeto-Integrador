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
      <main className="mx-auto flex w-full max-w-[1128px] flex-col gap-5 px-[var(--container-pad)] pt-7 pb-12 md:gap-7 md:pt-12 md:pb-20">
        <h1 className="m-0 font-display text-[30px] leading-[1.14] font-semibold tracking-[-0.015em] text-fg-strong md:text-[44px] md:leading-[1.1]">
          Painel administrativo
        </h1>
        {moderacaoService && sessao ? (
          <PainelModeracao service={moderacaoService} adminId={sessao.id} />
        ) : null}
      </main>
    </RouteGuard>
  );
}

"use client";

import { useEffect, useState } from "react";
import { RouteGuard } from "@/components/layout/RouteGuard";
import { PerfilArtesaoForm } from "@/components/painel-artesao/PerfilArtesaoForm";
import { useSessao } from "@/hooks/use-sessao";
import {
  obterOpcoesFiltroService,
  obterPerfilArtesaoService,
  obterSessionStore,
} from "@/services/fake/container";
import type { PerfilArtesaoService } from "@/services/contracts/perfil-artesao.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";
import type { SessionStore } from "@/store/sessao.store";

const STORE_INATIVO: SessionStore = {
  getSnapshot: () => null,
  subscribe: () => () => {},
} as unknown as SessionStore;

export default function PerfilArtesaoPage() {
  const [sessionStore, setSessionStore] = useState<SessionStore | null>(null);
  const [perfilService, setPerfilService] = useState<PerfilArtesaoService | null>(
    null
  );
  const [opcoesFiltroService, setOpcoesFiltroService] =
    useState<OpcoesFiltroService | null>(null);

  useEffect(() => {
    setSessionStore(obterSessionStore());
    setPerfilService(obterPerfilArtesaoService());
    setOpcoesFiltroService(obterOpcoesFiltroService());
  }, []);

  const sessao = useSessao(sessionStore ?? STORE_INATIVO);

  return (
    <RouteGuard sessionStore={sessionStore} papeisPermitidos={["artesao"]}>
      <main className="mx-auto flex w-full max-w-[1128px] flex-col gap-6 px-[var(--container-pad)] pt-8 pb-20 md:pt-12">
        <h1 className="m-0 font-display text-[30px] leading-[1.12] font-semibold tracking-[-0.015em] text-fg-strong md:text-[40px]">
          Meu perfil
        </h1>
        {perfilService && opcoesFiltroService && sessao ? (
          <PerfilArtesaoForm
            service={perfilService}
            opcoesFiltroService={opcoesFiltroService}
            artesaoId={sessao.id}
            nomeArtesao={sessao.nome}
          />
        ) : null}
      </main>
    </RouteGuard>
  );
}

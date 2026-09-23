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
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
        <h1 className="text-2xl font-semibold">Meu perfil</h1>
        {perfilService && opcoesFiltroService && sessao ? (
          <PerfilArtesaoForm
            service={perfilService}
            opcoesFiltroService={opcoesFiltroService}
            artesaoId={sessao.id}
          />
        ) : null}
      </main>
    </RouteGuard>
  );
}

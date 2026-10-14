"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BOTAO_SECUNDARIO } from "@/components/formulario/estilos-botao";
import { RouteGuard } from "@/components/layout/RouteGuard";
import { ProdutoForm } from "@/components/painel-artesao/ProdutoForm";
import { PendenciaPerfilArtesao } from "@/components/painel-artesao/PendenciaPerfilArtesao";
import { NotificacoesArtesao } from "@/components/painel-artesao/NotificacoesArtesao";
import type { NotificacoesService } from "@/services/contracts/notificacoes.contract";
import { Icone } from "@/components/vitrine/Icone";
import { useSessao } from "@/hooks/use-sessao";
import {
  obterPerfilArtesaoService,
  obterProdutosService,
  obterSessionStore,
  obterNotificacoesService,
} from "@/services/fake/container";
import type { PerfilArtesaoService } from "@/services/contracts/perfil-artesao.contract";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { SessionStore } from "@/store/sessao.store";

const STORE_INATIVO: SessionStore = {
  getSnapshot: () => null,
  subscribe: () => () => {},
} as unknown as SessionStore;

export default function PainelArtesaoPage() {
  const [notificacoesService, setNotificacoesService] =
    useState<NotificacoesService | null>(null);
  const [sessionStore, setSessionStore] = useState<SessionStore | null>(null);
  const [produtosService, setProdutosService] =
    useState<ProdutosService | null>(null);
  const [perfilService, setPerfilService] =
    useState<PerfilArtesaoService | null>(null);

  useEffect(() => {
    setSessionStore(obterSessionStore());
    setProdutosService(obterProdutosService());
    setPerfilService(obterPerfilArtesaoService());
    setNotificacoesService(obterNotificacoesService());
  }, []);

  const sessao = useSessao(sessionStore ?? STORE_INATIVO);

  return (
    <RouteGuard sessionStore={sessionStore} papeisPermitidos={["artesao"]}>
      <main className="mx-auto flex w-full max-w-[928px] flex-col gap-6 px-[var(--container-pad)] pt-8 pb-20 md:pt-12">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <h1 className="m-0 font-display text-[30px] leading-[1.12] font-semibold tracking-[-0.015em] text-fg-strong md:text-[40px]">
            Painel do artesão
          </h1>
          <Link href="/painel-artesao/produtos" className={BOTAO_SECUNDARIO}>
            <Icone nome="pacote" className="flex-none" />
            Meus produtos
          </Link>
        </div>
        {notificacoesService && sessao?.papel === "artesao" ? (
          <NotificacoesArtesao key={sessao.id} service={notificacoesService} />
        ) : null}
        {perfilService && sessao ? (
          <PendenciaPerfilArtesao
            service={perfilService}
            artesaoId={sessao.id}
          />
        ) : null}
        {produtosService && sessao ? (
          <ProdutoForm service={produtosService} artesaoId={sessao.id} />
        ) : null}
      </main>
    </RouteGuard>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RouteGuard } from "@/components/layout/RouteGuard";
import { ProdutoForm } from "@/components/painel-artesao/ProdutoForm";
import { useSessao } from "@/hooks/use-sessao";
import {
  obterProdutosService,
  obterSessionStore,
} from "@/services/fake/container";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { SessionStore } from "@/store/sessao.store";

const STORE_INATIVO: SessionStore = {
  getSnapshot: () => null,
  subscribe: () => () => {},
} as unknown as SessionStore;

export default function PainelArtesaoPage() {
  const [sessionStore, setSessionStore] = useState<SessionStore | null>(null);
  const [produtosService, setProdutosService] = useState<ProdutosService | null>(
    null
  );

  useEffect(() => {
    setSessionStore(obterSessionStore());
    setProdutosService(obterProdutosService());
  }, []);

  const sessao = useSessao(sessionStore ?? STORE_INATIVO);

  return (
    <RouteGuard sessionStore={sessionStore} papeisPermitidos={["artesao"]}>
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-6">
        <h1 className="text-2xl font-semibold">Painel do artesao</h1>
        <Link
          href="/painel-artesao/produtos"
          className="min-h-11 w-fit rounded border border-emerald-700 px-4 py-2 text-sm font-medium text-emerald-700"
        >
          Meus produtos
        </Link>
        {produtosService && sessao ? (
          <ProdutoForm service={produtosService} artesaoId={sessao.id} />
        ) : null}
      </main>
    </RouteGuard>
  );
}

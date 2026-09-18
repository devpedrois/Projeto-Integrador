"use client";

import { useEffect, useState } from "react";
import { RouteGuard } from "@/components/layout/RouteGuard";
import { MeusProdutosList } from "@/components/painel-artesao/MeusProdutosList";
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

export default function MeusProdutosPage() {
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
        {produtosService && sessao ? (
          <MeusProdutosList service={produtosService} artesaoId={sessao.id} />
        ) : null}
      </main>
    </RouteGuard>
  );
}

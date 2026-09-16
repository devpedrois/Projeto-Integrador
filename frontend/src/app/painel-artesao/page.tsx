"use client";

import { useEffect, useState } from "react";
import { RouteGuard } from "@/components/layout/RouteGuard";
import { obterSessionStore } from "@/services/fake/container";
import type { SessionStore } from "@/store/sessao.store";

export default function PainelArtesaoPage() {
  const [sessionStore, setSessionStore] = useState<SessionStore | null>(null);

  useEffect(() => {
    setSessionStore(obterSessionStore());
  }, []);

  return (
    <RouteGuard sessionStore={sessionStore} papeisPermitidos={["artesao"]}>
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-6">
        <h1 className="text-2xl font-semibold">Painel do artesao</h1>
      </main>
    </RouteGuard>
  );
}

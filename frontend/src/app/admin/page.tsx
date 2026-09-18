"use client";

import { useEffect, useState } from "react";
import { RouteGuard } from "@/components/layout/RouteGuard";
import { obterSessionStore } from "@/services/fake/container";
import type { SessionStore } from "@/store/sessao.store";

export default function AdminPage() {
  const [sessionStore, setSessionStore] = useState<SessionStore | null>(null);

  useEffect(() => {
    setSessionStore(obterSessionStore());
  }, []);

  return (
    <RouteGuard sessionStore={sessionStore} papeisPermitidos={["admin"]}>
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-6">
        <h1 className="text-2xl font-semibold">Painel administrativo</h1>
      </main>
    </RouteGuard>
  );
}

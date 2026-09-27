"use client";

import { useEffect, useState } from "react";
import { RouteGuard } from "@/components/layout/RouteGuard";
import { ResumoConta } from "@/components/minha-conta/ResumoConta";
import { obterSessionStore } from "@/services/fake/container";
import type { SessionStore } from "@/store/sessao.store";

export default function MinhaContaPage() {
  const [sessionStore, setSessionStore] = useState<SessionStore | null>(null);

  useEffect(() => {
    setSessionStore(obterSessionStore());
  }, []);

  return (
    <RouteGuard sessionStore={sessionStore}>
      {sessionStore ? <ResumoConta sessionStore={sessionStore} /> : null}
    </RouteGuard>
  );
}

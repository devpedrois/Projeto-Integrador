"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSessao } from "@/hooks/use-sessao";
import type { SessionStore } from "@/store/sessao.store";
import type { Papel } from "@/types/usuario";
import { paraDestinoSeguro } from "@/utils/rota-segura";

const STORE_INATIVO: SessionStore = {
  getSnapshot: () => null,
  subscribe: () => () => {},
} as unknown as SessionStore;

interface RouteGuardProps {
  sessionStore: SessionStore | null;
  papeisPermitidos?: Papel[];
  children: React.ReactNode;
}

export function RouteGuard({
  sessionStore,
  papeisPermitidos,
  children,
}: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sessao = useSessao(sessionStore ?? STORE_INATIVO);

  const restaurando = sessionStore === null;
  const semSessao = !restaurando && sessao === null;
  const papelNegado =
    !restaurando &&
    sessao !== null &&
    papeisPermitidos !== undefined &&
    !papeisPermitidos.includes(sessao.papel);

  useEffect(() => {
    if (semSessao) {
      const destino = paraDestinoSeguro(pathname);
      router.replace(`/login?redirect=${encodeURIComponent(destino)}`);
    }
  }, [semSessao, router, pathname]);

  // Guarda client-side vale so para AV1: nao substitui autorizacao no
  // backend final, que ainda validara papel/sessao no servidor.
  if (restaurando || semSessao) return null;

  if (papelNegado) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold">Acesso negado</h1>
        <p className="text-sm text-neutral-600">
          Seu usuario nao tem permissao para acessar esta area.
        </p>
      </main>
    );
  }

  return <>{children}</>;
}

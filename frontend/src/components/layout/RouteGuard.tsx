"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BOTAO_SECUNDARIO } from "@/components/formulario/estilos-botao";
import {
  CLASSE_VAZIO,
  IconeVazio,
} from "@/components/vitrine/EsqueletoProdutos";
import { useSessao, useEstadoSessao } from "@/hooks/use-sessao";
import { SessaoIndisponivel } from "@/components/layout/SessaoIndisponivel";
import type { SessionStore } from "@/store/sessao.store";
import type { Papel } from "@/types/usuario";
import { paraDestinoSeguro } from "@/utils/rota-segura";

const STORE_INATIVO: SessionStore = {
  getSnapshot: () => null,
  subscribe: () => () => {},
} as unknown as SessionStore;

const SAIDA_POR_PAPEL: Record<Papel, { href: string; rotulo: string }> = {
  comprador: { href: "/", rotulo: "Voltar para a vitrine" },
  artesao: { href: "/painel-artesao", rotulo: "Ir para o painel do artesão" },
  admin: { href: "/admin", rotulo: "Ir para o painel admin" },
};

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
  const estado = useEstadoSessao(sessionStore ?? STORE_INATIVO);

  const restaurando = sessionStore === null || estado.restaurando;
  const semSessao = !restaurando && !estado.erro && sessao === null;
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

  if (restaurando || semSessao) return null;
  if (estado.erro && sessionStore)
    return <SessaoIndisponivel store={sessionStore} />;

  if (papelNegado && sessao) {
    const saida = SAIDA_POR_PAPEL[sessao.papel];

    return (
      <main className="mx-auto min-h-screen w-full max-w-[720px] px-4 pt-10 pb-16 sm:px-6 sm:pt-16 sm:pb-24">
        <div className={CLASSE_VAZIO}>
          <IconeVazio nome="escudo" />
          <h1 className="m-0 font-display text-2xl leading-[1.2] font-semibold text-fg-strong">
            Acesso negado
          </h1>
          <p className="m-0 max-w-[420px] text-body-sm text-fg-muted">
            Seu usuário não tem permissão para acessar esta área.
          </p>
          <Link href={saida.href} className={BOTAO_SECUNDARIO}>
            {saida.rotulo}
          </Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

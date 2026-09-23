"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSessao } from "@/hooks/use-sessao";
import { obterModoAcessoStorage, obterSessionStore } from "@/services/fake/container";
import type { SessionStore } from "@/store/sessao.store";
import type { ModoAcessoStorage } from "@/fake-api/storage/modo-acesso.storage";
import type { Papel } from "@/types/usuario";

const LINKS_POR_PAPEL: Record<Papel, { href: string; rotulo: string }[]> = {
  comprador: [
    { href: "/", rotulo: "Vitrine" },
    { href: "/carrinho", rotulo: "Carrinho" },
    { href: "/minha-conta", rotulo: "Minha conta" },
  ],
  artesao: [
    { href: "/painel-artesao", rotulo: "Painel do artesao" },
    { href: "/painel-artesao/produtos", rotulo: "Meus produtos" },
    { href: "/painel-artesao/perfil", rotulo: "Meu perfil" },
    { href: "/", rotulo: "Vitrine" },
  ],
  admin: [
    { href: "/admin", rotulo: "Painel admin" },
    { href: "/minha-conta", rotulo: "Minha conta" },
    { href: "/", rotulo: "Vitrine" },
  ],
};

const STORE_INATIVO: SessionStore = {
  getSnapshot: () => null,
  subscribe: () => () => {},
} as unknown as SessionStore;

interface GateAcessoProps {
  children: React.ReactNode;
}

export function GateAcesso({ children }: GateAcessoProps) {
  const [sessionStore, setSessionStore] = useState<SessionStore | null>(null);
  const [modoAcessoStorage, setModoAcessoStorage] = useState<ModoAcessoStorage | null>(null);
  const [modoVisitante, setModoVisitante] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setSessionStore(obterSessionStore());
    const storage = obterModoAcessoStorage();
    setModoAcessoStorage(storage);
    setModoVisitante(storage.ehVisitante());
  }, []);

  const sessao = useSessao(sessionStore ?? STORE_INATIVO);
  const restaurando = sessionStore === null || modoAcessoStorage === null;
  const naPaginaDeLogin = pathname === "/login";
  const liberado = !restaurando && (sessao !== null || modoVisitante || naPaginaDeLogin);

  function escolherVisitante(): void {
    modoAcessoStorage?.definirVisitante();
    setModoVisitante(true);
  }

  if (restaurando) return null;

  if (!liberado) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
        <h1 className="text-2xl font-semibold">Entrar como</h1>
        <p className="text-sm text-neutral-600">
          Escolha como deseja acessar o Origem.
        </p>
        <div className="flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={escolherVisitante}
            className="min-h-11 rounded border border-gray-300 p-2 text-sm"
          >
            Continuar como visitante
          </button>
          <Link
            href="/login"
            className="flex min-h-11 items-center justify-center rounded border border-emerald-700 p-2 text-sm text-emerald-700"
          >
            Entrar como comprador
          </Link>
          <Link
            href="/login"
            className="flex min-h-11 items-center justify-center rounded border border-emerald-700 p-2 text-sm text-emerald-700"
          >
            Entrar como artesao
          </Link>
          <Link
            href="/login"
            className="flex min-h-11 items-center justify-center rounded border border-emerald-700 p-2 text-sm text-emerald-700"
          >
            Entrar como administrador
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      {!naPaginaDeLogin ? <BarraDeConta sessionStore={sessionStore} /> : null}
      {children}
    </>
  );
}

function BarraDeConta({ sessionStore }: { sessionStore: SessionStore }) {
  const sessao = useSessao(sessionStore);
  const router = useRouter();
  const [mostrarOpcoesLogin, setMostrarOpcoesLogin] = useState(false);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);

  function confirmarSaida(): void {
    sessionStore.logout();
    router.push("/");
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-2 text-sm">
      {sessao ? (
        <nav className="flex items-center gap-3">
          {LINKS_POR_PAPEL[sessao.papel].map((link) => (
            <Link key={link.href} href={link.href} className="underline">
              {link.rotulo}
            </Link>
          ))}
        </nav>
      ) : (
        <span />
      )}

      {sessao && confirmandoSaida ? (
        <div className="flex items-center gap-3">
          <span className="text-neutral-600">Tem certeza que quer sair?</span>
          <button type="button" onClick={confirmarSaida} className="underline">
            Sim, sair
          </button>
          <button
            type="button"
            onClick={() => setConfirmandoSaida(false)}
            className="underline"
          >
            Cancelar
          </button>
        </div>
      ) : sessao ? (
        <div className="flex items-center gap-3">
          <span className="text-neutral-600">
            {sessao.nome} ({sessao.papel})
          </span>
          <button
            type="button"
            onClick={() => setConfirmandoSaida(true)}
            className="underline"
          >
            Sair
          </button>
        </div>
      ) : mostrarOpcoesLogin ? (
        <div className="flex items-center gap-3">
          <span className="text-neutral-600">Entrar como:</span>
          <Link href="/login" className="underline">
            Comprador
          </Link>
          <Link href="/login" className="underline">
            Artesao
          </Link>
          <Link href="/login" className="underline">
            Administrador
          </Link>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setMostrarOpcoesLogin(true)}
          className="underline"
        >
          Entrar
        </button>
      )}
    </div>
  );
}

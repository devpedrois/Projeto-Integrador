"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icone } from "@/components/vitrine/Icone";
import { useSessao } from "@/hooks/use-sessao";
import { useCarrinho } from "@/hooks/use-carrinho";
import {
  obterCarrinhoStore,
  obterModoAcessoStorage,
  obterSessionStore,
} from "@/services/fake/container";
import type { SessionStore } from "@/store/sessao.store";
import type { CartStore } from "@/store/carrinho.store";
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

const BOTAO_BASE =
  "inline-flex items-center justify-center rounded-control font-semibold leading-tight whitespace-nowrap no-underline transition-colors duration-[var(--dur-fast)] ease-out active:translate-y-px";

const BOTAO_PRIMARIO = `${BOTAO_BASE} h-[var(--control-h-md)] w-full border border-transparent bg-action-primary px-5 text-button text-fg-on-brand hover:bg-action-primary-hover hover:text-fg-on-brand active:bg-action-primary-press`;

const BOTAO_SECUNDARIO = `${BOTAO_BASE} h-[var(--control-h-md)] w-full border border-border-strong bg-surface-card px-5 text-button text-fg-strong hover:bg-action-secondary-hover hover:text-fg-strong active:bg-linho-200`;

const BOTAO_SECUNDARIO_PEQUENO = `${BOTAO_BASE} h-[var(--control-h-sm)] border border-border-strong bg-surface-card px-3.5 text-sm text-fg-strong hover:bg-action-secondary-hover hover:text-fg-strong active:bg-linho-200`;

const BOTAO_PERIGO_PEQUENO = `${BOTAO_BASE} h-[var(--control-h-sm)] border border-transparent bg-action-danger px-3.5 text-sm text-white hover:bg-action-danger-hover`;

const LINK_NAV =
  "flex h-11 gap-2 shrink-0 items-center px-0.5 text-button font-medium whitespace-nowrap text-fg-muted no-underline transition-colors duration-[var(--dur-fast)] ease-out hover:text-fg-strong md:h-full";

const LINK_NAV_ATIVO = `${LINK_NAV} font-semibold text-fg-strong shadow-[inset_0_-2px_0_var(--color-barro-500)]`;

const STORE_INATIVO: SessionStore = {
  getSnapshot: () => null,
  subscribe: () => () => {},
} as unknown as SessionStore;

const CARRINHO_VAZIO = { itens: [], total: 0, atualizadoEm: "" };

const CARRINHO_STORE_INATIVO: CartStore = {
  getSnapshot: () => CARRINHO_VAZIO,
  subscribe: () => () => {},
} as unknown as CartStore;

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
      <main className="flex min-h-screen items-center justify-center bg-surface-page px-4 py-12">
        <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-card border border-border-default bg-surface-card p-8 text-center shadow-card sm:p-10">
          <span className="font-display text-h2 font-semibold tracking-display text-fg-strong">
            Origem
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-h1">Entrar como</h1>
            <p className="text-body-sm text-fg-muted">
              Escolha como deseja acessar o Origem.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3">
            <button type="button" onClick={escolherVisitante} className={BOTAO_PRIMARIO}>
              Continuar como visitante
            </button>
            <Link href="/login" className={BOTAO_SECUNDARIO}>
              Entrar como comprador
            </Link>
            <Link href="/login" className={BOTAO_SECUNDARIO}>
              Entrar como artesao
            </Link>
            <Link href="/login" className={BOTAO_SECUNDARIO}>
              Entrar como administrador
            </Link>
          </div>
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
  const pathname = usePathname();
  const [mostrarOpcoesLogin, setMostrarOpcoesLogin] = useState(false);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);

  function confirmarSaida(): void {
    sessionStore.logout();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border-default bg-linho-25/90 backdrop-blur-md backdrop-saturate-[1.2]">
      <div className="mx-auto flex min-h-[var(--header-h-mobile)] max-w-[var(--container-max)] flex-wrap items-center gap-x-8 gap-y-2 px-[var(--container-pad)] py-2 md:min-h-[var(--header-h)] md:flex-nowrap md:py-0">
        <Link
          href="/"
          className="font-display text-[28px] leading-none font-semibold tracking-[-0.02em] text-fg-strong no-underline hover:text-fg-strong"
        >
          Origem
        </Link>

        {sessao ? (
          <nav className="order-last -mx-1 flex w-full items-center gap-6 overflow-x-auto px-1 md:order-none md:h-[var(--header-h)] md:w-auto md:gap-7">
            {LINKS_POR_PAPEL[sessao.papel].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={pathname === link.href ? LINK_NAV_ATIVO : LINK_NAV}
              >
                {link.rotulo}
                {link.href === "/carrinho" ? (
                  <ContadorCarrinho usuarioId={sessao?.id} />
                ) : null}
              </Link>
            ))}
          </nav>
        ) : null}

        <div className="ml-auto flex items-center gap-2 text-body-sm">
          {!sessao ? (
            <Link
              href="/carrinho"
              className="flex h-11 items-center gap-2 rounded-md px-2.5 text-button font-semibold text-fg-strong no-underline transition-colors duration-[var(--dur-fast)] ease-out hover:bg-action-secondary-hover hover:text-fg-strong"
            >
              <Icone nome="sacola" tamanho={22} />
              Carrinho
              <ContadorCarrinho />
            </Link>
          ) : null}
          {sessao && confirmandoSaida ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="text-fg-muted">Tem certeza que quer sair?</span>
              <button type="button" onClick={confirmarSaida} className={BOTAO_PERIGO_PEQUENO}>
                Sim, sair
              </button>
              <button
                type="button"
                onClick={() => setConfirmandoSaida(false)}
                className={BOTAO_SECUNDARIO_PEQUENO}
              >
                Cancelar
              </button>
            </div>
          ) : sessao ? (
            <div className="flex items-center gap-3 md:border-l md:border-border-default md:pl-3">
              <span
                aria-hidden="true"
                className="hidden size-[34px] place-items-center rounded-pill bg-barro-100 text-[13px] font-bold text-barro-800 sm:grid"
              >
                {sessao.nome.slice(0, 1).toUpperCase()}
              </span>
              <span className="font-semibold text-fg-strong">
                {sessao.nome} ({sessao.papel})
              </span>
              <button
                type="button"
                onClick={() => setConfirmandoSaida(true)}
                className={BOTAO_SECUNDARIO_PEQUENO}
              >
                Sair
              </button>
            </div>
          ) : mostrarOpcoesLogin ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="text-fg-muted">Entrar como:</span>
              <Link href="/login" className={BOTAO_SECUNDARIO_PEQUENO}>
                Comprador
              </Link>
              <Link href="/login" className={BOTAO_SECUNDARIO_PEQUENO}>
                Artesao
              </Link>
              <Link href="/login" className={BOTAO_SECUNDARIO_PEQUENO}>
                Administrador
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMostrarOpcoesLogin(true)}
              className={BOTAO_SECUNDARIO_PEQUENO}
            >
              Entrar
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function ContadorCarrinho({ usuarioId }: { usuarioId?: string }) {
  const [carrinhoStore, setCarrinhoStore] = useState<CartStore | null>(null);

  useEffect(() => {
    setCarrinhoStore(obterCarrinhoStore(usuarioId));
  }, [usuarioId]);

  const quantidade = useCarrinho(carrinhoStore ?? CARRINHO_STORE_INATIVO).itens.length;

  return (
    <span
      className={`grid h-[22px] min-w-[22px] place-items-center rounded-pill px-[7px] text-caption font-bold tabular-nums ${
        quantidade > 0 ? "bg-barro-500 text-fg-on-brand" : "bg-linho-100 text-fg-muted"
      }`}
    >
      {quantidade}
    </span>
  );
}

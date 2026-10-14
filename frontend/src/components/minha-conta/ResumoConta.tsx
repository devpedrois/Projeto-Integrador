"use client";

import { useRouter } from "next/navigation";
import { Icone } from "@/components/vitrine/Icone";
import { useSessao } from "@/hooks/use-sessao";
import type { SessionStore } from "@/store/sessao.store";
import { ROTULO_PAPEL } from "@/utils/rotulo-papel";
import { MeusPedidos } from "@/components/minha-conta/MeusPedidos";
import type { PedidosService } from "@/services/contracts/pedidos.contract";

const CLASSE_ROTULO = "text-[13px] font-semibold text-fg-muted";

export function ResumoConta({
  sessionStore,
  pedidosService,
}: {
  sessionStore: SessionStore;
  pedidosService: PedidosService | null;
}) {
  const sessao = useSessao(sessionStore);
  const router = useRouter();

  if (!sessao) return null;

  function sair(): void {
    sessionStore.logout();
    router.push("/");
  }

  return (
    <main className="mx-auto flex w-full max-w-[var(--container-max)] flex-col gap-5 px-[var(--container-pad)] pt-6 pb-8 md:gap-8 md:py-14">
      <h1 className="m-0 text-[34px] leading-[1.1] tracking-[-0.015em] md:text-[48px] md:leading-[1.08]">
        Minha conta
      </h1>
      <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)] md:gap-6">
        <section className="flex flex-col gap-5 rounded-card border border-border-subtle bg-surface-card p-5 shadow-card md:gap-6 md:p-6">
          <dl className="m-0 flex flex-col gap-3.5 md:gap-[18px]">
            <div className="flex flex-col gap-1">
              <dt className={CLASSE_ROTULO}>Nome</dt>
              <dd className="m-0 text-[17px] font-semibold text-fg-strong">
                {sessao.nome}
              </dd>
            </div>
            <div className="h-px bg-border-subtle" />
            <div className="flex flex-col gap-1">
              <dt className={CLASSE_ROTULO}>E-mail</dt>
              <dd className="m-0 text-base break-all text-fg-body">
                {sessao.email}
              </dd>
            </div>
            <div className="h-px bg-border-subtle" />
            <div className="flex flex-col gap-1.5">
              <dt className={CLASSE_ROTULO}>Papel</dt>
              <dd className="m-0">
                <span className="inline-flex h-7 items-center rounded-pill bg-barro-50 px-3 text-sm font-semibold text-barro-700">
                  {ROTULO_PAPEL[sessao.papel]}
                </span>
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={sair}
            className="inline-flex h-[var(--control-h-lg)] w-full items-center justify-center gap-2 rounded-control border border-border-strong bg-surface-card px-5 text-button font-semibold text-fg-strong transition-colors duration-[var(--dur-fast)] ease-out hover:bg-action-secondary-hover active:translate-y-px active:bg-linho-200 md:h-[var(--control-h-md)]"
          >
            <Icone nome="sair" className="flex-none" />
            Sair
          </button>
        </section>

        {sessao.papel === "comprador" && pedidosService ? (
          <MeusPedidos key={sessao.id} service={pedidosService} />
        ) : null}
      </div>
    </main>
  );
}

import { Icone } from "@/components/vitrine/Icone";
import type { NomeIcone } from "@/components/vitrine/Icone";

export const BLOCO =
  "block rounded-sm bg-[linear-gradient(90deg,var(--color-linho-100)_0px,var(--color-linho-50)_160px,var(--color-linho-100)_320px)] bg-[length:800px_100%] animate-og-shimmer motion-reduce:animate-none";

export function EsqueletoProdutos({ quantidade = 6 }: { quantidade?: number }) {
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-[var(--grid-gap)] md:grid-cols-3">
      {Array.from({ length: quantidade }, (_, indice) => (
        <div
          key={indice}
          className="flex flex-col gap-2.5 rounded-card border border-border-subtle bg-surface-card p-3"
        >
          <span className={`${BLOCO} aspect-[4/5] rounded-media`} />
          <span className={`${BLOCO} mt-1 h-4 w-4/5`} />
          <span className={`${BLOCO} h-3 w-[55%]`} />
          <span className={`${BLOCO} mt-1 h-[18px] w-[35%]`} />
          <span className={`${BLOCO} mt-1 h-9 rounded-control`} />
        </div>
      ))}
    </div>
  );
}

export function EsqueletoCompacto({ quantidade = 4 }: { quantidade?: number }) {
  return (
    <div aria-hidden="true" className="contents">
      {Array.from({ length: quantidade }, (_, indice) => (
        <div
          key={indice}
          className="flex w-[260px] flex-none items-center gap-3 rounded-md border border-border-subtle bg-surface-card p-2.5 sm:w-auto"
        >
          <span className={`${BLOCO} size-16 flex-none`} />
          <span className="flex flex-1 flex-col gap-2">
            <span className={`${BLOCO} h-3.5 w-4/5`} />
            <span className={`${BLOCO} h-3 w-2/5`} />
          </span>
        </div>
      ))}
    </div>
  );
}

export function IconeVazio({ nome }: { nome: NomeIcone }) {
  return (
    <span
      aria-hidden="true"
      className="mb-1 grid h-[84px] w-[72px] place-items-center rounded-[999px_999px_14px_14px] bg-barro-50 text-barro-600"
    >
      <Icone nome={nome} tamanho={32} />
    </span>
  );
}

export const CLASSE_STATUS = "text-body-sm text-fg-muted";

export const CLASSE_ALERTA =
  "flex items-start gap-2 rounded-md border border-erro-500/30 bg-erro-50 px-4 py-3 text-body-sm text-erro-700";

export const CLASSE_VAZIO =
  "flex flex-col items-center gap-3.5 rounded-lg border border-dashed border-border-strong bg-surface-raised px-6 py-12 text-center";

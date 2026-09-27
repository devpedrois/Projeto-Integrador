import { Icone } from "@/components/vitrine/Icone";

export const CLASSE_CONTROLE =
  "w-full rounded-control border bg-surface-card text-base text-fg-strong inset-shadow-xs transition-[border-color,box-shadow] duration-[var(--dur-fast)] ease-out hover:border-linho-400 focus:shadow-[var(--focus-ring)] focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-70";

export function classeBordaControle(erro: string | undefined): string {
  return erro
    ? "border-erro-500 hover:border-erro-500 focus:border-erro-500 focus:shadow-[0_0_0_3px_rgba(179,38,30,0.2)]"
    : "border-border-input focus:border-border-focus";
}

export function RotuloCampo({
  htmlFor,
  rotulo,
  opcional = false,
}: {
  htmlFor: string;
  rotulo: string;
  opcional?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex items-baseline gap-1.5 text-sm leading-[1.3] font-semibold text-fg-strong"
    >
      {rotulo}
      {opcional ? <span className="text-[13px] font-normal text-fg-muted">(opcional)</span> : null}
    </label>
  );
}

export function ErroCampo({ id, erro }: { id: string; erro: string }) {
  return (
    <p id={id} className="m-0 flex flex-1 items-start gap-1.5 text-[13px] leading-[1.4] text-erro-700">
      <Icone nome="alerta" tamanho={16} className="mt-px flex-none" />
      {erro}
    </p>
  );
}
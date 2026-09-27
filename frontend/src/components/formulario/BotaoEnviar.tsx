interface BotaoEnviarProps {
  enviando: boolean;
  children: React.ReactNode;
}

export function BotaoEnviar({ enviando, children }: BotaoEnviarProps) {
  return (
    <button
      type="submit"
      disabled={enviando}
      aria-busy={enviando || undefined}
      className="mt-2 inline-flex h-[var(--control-h-lg)] w-full items-center justify-center gap-2 rounded-control border border-transparent bg-action-primary px-6 text-base font-semibold text-fg-on-brand transition-colors duration-[var(--dur-fast)] ease-out hover:bg-action-primary-hover active:translate-y-px active:bg-action-primary-press disabled:cursor-not-allowed disabled:border-border-default disabled:bg-action-disabled-bg disabled:text-action-disabled-fg disabled:active:translate-y-0"
    >
      {enviando ? (
        <span
          aria-hidden="true"
          className="size-[18px] flex-none animate-og-spin rounded-pill border-2 border-current/30 border-t-current motion-reduce:animate-none"
        />
      ) : null}
      {children}
    </button>
  );
}

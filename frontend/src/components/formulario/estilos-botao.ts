const BASE =
  "inline-flex items-center justify-center gap-2 rounded-control border font-semibold leading-tight whitespace-nowrap no-underline transition-colors duration-[var(--dur-fast)] ease-out active:translate-y-px disabled:cursor-not-allowed disabled:active:translate-y-0";

const PRIMARIO =
  "border-transparent bg-action-primary text-fg-on-brand hover:bg-action-primary-hover hover:text-fg-on-brand active:bg-action-primary-press disabled:border-border-default disabled:bg-action-disabled-bg disabled:text-action-disabled-fg";

const SECUNDARIO =
  "border-border-strong bg-surface-card text-fg-strong hover:bg-action-secondary-hover hover:text-fg-strong active:bg-linho-200 disabled:opacity-60";

const SECUNDARIO_PERIGO =
  "border-border-strong bg-surface-card text-erro-700 hover:bg-action-secondary-hover hover:text-erro-700 active:bg-linho-200 disabled:opacity-60";

const PERIGO =
  "border-transparent bg-action-danger text-white hover:bg-action-danger-hover hover:text-white disabled:opacity-60";

const GRANDE = "h-[var(--control-h-lg)] px-6 text-base";
const MEDIO = "h-[var(--control-h-md)] px-5 text-button";
const PEQUENO = "h-[var(--control-h-sm)] px-3.5 text-sm";

export const BOTAO_PRIMARIO_GRANDE = `${BASE} ${PRIMARIO} ${GRANDE}`;
export const BOTAO_SECUNDARIO = `${BASE} ${SECUNDARIO} ${MEDIO}`;
export const BOTAO_SECUNDARIO_PEQUENO = `${BASE} ${SECUNDARIO} ${PEQUENO}`;
export const BOTAO_PERIGO_PEQUENO = `${BASE} ${PERIGO} ${PEQUENO}`;
export const BOTAO_REMOVER = `${BASE} ${SECUNDARIO_PERIGO} ${MEDIO}`;
export const BOTAO_REMOVER_PEQUENO = `${BASE} ${SECUNDARIO_PERIGO} ${PEQUENO}`;
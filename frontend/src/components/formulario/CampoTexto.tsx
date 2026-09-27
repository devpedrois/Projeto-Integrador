"use client";

import { useState, type InputHTMLAttributes, type Ref } from "react";
import { Icone } from "@/components/vitrine/Icone";

interface CampoTextoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className"> {
  id: string;
  rotulo: string;
  erro?: string;
  ref?: Ref<HTMLInputElement>;
}

const CLASSE_INPUT =
  "h-[var(--control-h-md)] w-full rounded-control border bg-surface-card px-3.5 text-base text-fg-strong inset-shadow-xs transition-[border-color,box-shadow] duration-[var(--dur-fast)] ease-out hover:border-linho-400 focus:shadow-[var(--focus-ring)] focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-70";

export function CampoTexto({ id, rotulo, erro, type = "text", ref, ...resto }: CampoTextoProps) {
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const ehSenha = type === "password";
  const idErro = `${id}-erro`;
  const classeBorda = erro
    ? "border-erro-500 hover:border-erro-500 focus:border-erro-500 focus:shadow-[0_0_0_3px_rgba(179,38,30,0.2)]"
    : "border-border-input focus:border-border-focus";

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm leading-[1.3] font-semibold text-fg-strong">
        {rotulo}
      </label>
      <div className="relative flex items-center">
        <input
          id={id}
          ref={ref}
          type={ehSenha && senhaVisivel ? "text" : type}
          aria-invalid={Boolean(erro)}
          aria-describedby={erro ? idErro : undefined}
          className={`${CLASSE_INPUT} ${classeBorda} ${ehSenha ? "pr-11" : ""}`}
          {...resto}
        />
        {ehSenha ? (
          <button
            type="button"
            onClick={() => setSenhaVisivel((visivel) => !visivel)}
            aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
            className="absolute right-1.5 grid size-9 place-items-center rounded-md text-fg-muted transition-colors duration-[var(--dur-fast)] hover:text-fg-strong"
          >
            <Icone nome={senhaVisivel ? "olhoFechado" : "olho"} />
          </button>
        ) : null}
      </div>
      {erro ? (
        <p id={idErro} className="m-0 flex items-start gap-1.5 text-[13px] leading-[1.4] text-erro-700">
          <Icone nome="alerta" tamanho={16} className="mt-px flex-none" />
          {erro}
        </p>
      ) : null}
    </div>
  );
}

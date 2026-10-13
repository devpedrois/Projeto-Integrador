"use client";

import { useState, type InputHTMLAttributes, type Ref } from "react";
import { Icone, type NomeIcone } from "@/components/vitrine/Icone";
import {
  CLASSE_CONTROLE,
  ErroCampo,
  RotuloCampo,
  classeBordaControle,
} from "@/components/formulario/partes-campo";

interface CampoTextoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className"> {
  id: string;
  rotulo: string;
  erro?: string;
  ajuda?: string;
  icone?: NomeIcone;
  opcional?: boolean;
  ref?: Ref<HTMLInputElement>;
}

export function CampoTexto({
  id,
  rotulo,
  erro,
  ajuda,
  icone,
  opcional,
  type = "text",
  ref,
  ...resto
}: CampoTextoProps) {
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const ehSenha = type === "password";
  const idErro = `${id}-erro`;
  const idAjuda = `${id}-ajuda`;
  const descritores = [ajuda ? idAjuda : null, erro ? idErro : null].filter(Boolean).join(" ");
  const recuoEsquerdo = icone ? "pl-[42px]" : "pl-3.5";

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <RotuloCampo htmlFor={id} rotulo={rotulo} opcional={opcional} />
      <div className="relative flex items-center">
        {icone ? (
          <Icone nome={icone} className="pointer-events-none absolute left-3.5 text-fg-muted" />
        ) : null}
        <input
          id={id}
          ref={ref}
          type={ehSenha && senhaVisivel ? "text" : type}
          aria-invalid={Boolean(erro)}
          aria-describedby={descritores || undefined}
          className={`${CLASSE_CONTROLE} ${classeBordaControle(erro)} h-[var(--control-h-md)] ${recuoEsquerdo} ${ehSenha ? "pr-11" : "pr-3.5"}`}
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
      {ajuda ? (
        <p id={idAjuda} className="m-0 text-[13px] leading-[1.4] text-fg-muted">
          {ajuda}
        </p>
      ) : null}
      {erro ? <ErroCampo id={idErro} erro={erro} /> : null}
    </div>
  );
}
import type { Ref, TextareaHTMLAttributes } from "react";
import {
  CLASSE_CONTROLE,
  ErroCampo,
  RotuloCampo,
  classeBordaControle,
} from "@/components/formulario/partes-campo";

interface CampoAreaTextoProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "className"> {
  id: string;
  rotulo: string;
  erro?: string;
  limite?: number;
  ref?: Ref<HTMLTextAreaElement>;
}

export function CampoAreaTexto({
  id,
  rotulo,
  erro,
  limite,
  value,
  rows = 4,
  ref,
  ...resto
}: CampoAreaTextoProps) {
  const idErro = `${id}-erro`;
  const tamanho = String(value ?? "").length;
  const excedeu = limite !== undefined && tamanho > limite;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <RotuloCampo htmlFor={id} rotulo={rotulo} />
      <textarea
        id={id}
        ref={ref}
        rows={rows}
        value={value}
        aria-invalid={Boolean(erro)}
        aria-describedby={erro ? idErro : undefined}
        className={`${CLASSE_CONTROLE} ${classeBordaControle(erro)} block min-h-24 resize-y px-3.5 py-3 leading-normal`}
        {...resto}
      />
      {erro || limite !== undefined ? (
        <div className="flex items-start gap-2">
          {erro ? <ErroCampo id={idErro} erro={erro} /> : <span className="flex-1" />}
          {limite !== undefined ? (
            <span
              className={`text-[13px] leading-[1.4] tabular-nums ${excedeu ? "font-semibold text-erro-700" : "text-fg-muted"}`}
            >
              {`${tamanho}/${limite}`}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
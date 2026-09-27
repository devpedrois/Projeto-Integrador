import type { Ref, SelectHTMLAttributes } from "react";
import { Icone } from "@/components/vitrine/Icone";
import {
  CLASSE_CONTROLE,
  ErroCampo,
  RotuloCampo,
  classeBordaControle,
} from "@/components/formulario/partes-campo";

export interface OpcaoSelecao {
  valor: string;
  rotulo: string;
}

interface CampoSelecaoProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "className"> {
  id: string;
  rotulo: string;
  opcoes: readonly OpcaoSelecao[];
  erro?: string;
  placeholder?: string;
  ref?: Ref<HTMLSelectElement>;
}

export function CampoSelecao({
  id,
  rotulo,
  opcoes,
  erro,
  placeholder = "Selecione",
  ref,
  ...resto
}: CampoSelecaoProps) {
  const idErro = `${id}-erro`;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <RotuloCampo htmlFor={id} rotulo={rotulo} />
      <div className="relative flex items-center">
        <select
          id={id}
          ref={ref}
          aria-invalid={Boolean(erro)}
          aria-describedby={erro ? idErro : undefined}
          className={`${CLASSE_CONTROLE} ${classeBordaControle(erro)} h-[var(--control-h-md)] cursor-pointer appearance-none pr-[42px] pl-3.5`}
          {...resto}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {opcoes.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>
        <Icone nome="seta" className="pointer-events-none absolute right-3.5 text-fg-muted" />
      </div>
      {erro ? <ErroCampo id={idErro} erro={erro} /> : null}
    </div>
  );
}
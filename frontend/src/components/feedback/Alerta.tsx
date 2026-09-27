import { Icone, type NomeIcone } from "@/components/vitrine/Icone";

type TomAlerta = "sucesso" | "erro" | "aviso";

const TONS: Record<TomAlerta, { classe: string; icone: NomeIcone }> = {
  sucesso: {
    classe: "border-sucesso-500/30 bg-sucesso-50 text-sucesso-700",
    icone: "sucesso",
  },
  erro: { classe: "border-erro-500/30 bg-erro-50 text-erro-700", icone: "alerta" },
  aviso: { classe: "border-aviso-500/30 bg-aviso-50 text-aviso-700", icone: "aviso" },
};

interface AlertaProps {
  tom: TomAlerta;
  titulo?: string;
  children?: React.ReactNode;
  onFechar?: () => void;
}

export function Alerta({ tom, titulo, children, onFechar }: AlertaProps) {
  const { classe, icone } = TONS[tom];

  return (
    <div
      role={tom === "erro" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-md border px-4 py-3.5 text-body-sm ${classe}`}
    >
      <Icone nome={icone} tamanho={20} className="mt-px flex-none" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {titulo ? <strong className="text-[15px] font-bold">{titulo}</strong> : null}
        {children ? <div className="text-fg-body">{children}</div> : null}
      </div>
      {onFechar ? (
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar mensagem"
          className="-my-1.5 -mr-2 grid size-8 flex-none place-items-center rounded-sm text-current transition-colors duration-[var(--dur-fast)] hover:bg-black/5"
        >
          <Icone nome="fechar" />
        </button>
      ) : null}
    </div>
  );
}
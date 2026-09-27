import { Icone } from "@/components/vitrine/Icone";

export function AlertaErro({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-md border border-erro-500/30 bg-erro-50 px-4 py-3.5 text-body-sm text-erro-700"
    >
      <Icone nome="alerta" tamanho={20} className="mt-px flex-none" />
      <p className="m-0 min-w-0 flex-1">{children}</p>
    </div>
  );
}

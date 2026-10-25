import type { StatusItemPedido } from "@/types/pedido";

export function StatusDoItem({
  status,
  enviadoEm,
}: {
  status: StatusItemPedido;
  enviadoEm: string | null;
}) {
  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-2 text-sm"
      aria-live="polite"
    >
      <span
        className={`rounded-pill px-3 py-1 font-semibold ${status === "enviado" ? "bg-sucesso-50 text-sucesso-700" : "bg-aviso-50 text-aviso-700"}`}
      >
        {status === "enviado" ? "Enviado" : "Aguardando envio"}
      </span>
      {enviadoEm ? (
        <time dateTime={enviadoEm} className="text-fg-muted">
          {new Date(enviadoEm).toLocaleString("pt-BR", {
            timeZone: "America/Recife",
          })}
        </time>
      ) : null}
    </div>
  );
}

"use client";

import type { NotificacoesService } from "@/services/contracts/notificacoes.contract";
import { useNotificacoesArtesao } from "@/hooks/use-notificacoes-artesao";
import { BOTAO_SECUNDARIO } from "@/components/formulario/estilos-botao";

export function NotificacoesArtesao({
  service,
}: {
  service: NotificacoesService;
}) {
  const { estado, marcando, erroLeitura, marcarComoLida, recarregar } =
    useNotificacoesArtesao(service);
  const novas =
    estado.status === "sucesso" ? estado.dados.filter((n) => !n.lida) : [];
  return (
    <section
      aria-labelledby="notificacoes-titulo"
      className="rounded-card border border-border-subtle bg-surface-card p-5 shadow-card"
    >
      <h2
        id="notificacoes-titulo"
        className="font-display text-xl font-semibold text-fg-strong"
      >
        Pedidos recebidos
      </h2>
      {estado.status === "carregando" ? (
        <p role="status">Carregando notificações...</p>
      ) : null}
      {estado.status === "erro" ? (
        <div role="alert">
          <p>Não foi possível carregar suas notificações.</p>
          <button
            type="button"
            className={BOTAO_SECUNDARIO}
            onClick={recarregar}
          >
            Tentar novamente
          </button>
        </div>
      ) : null}
      {estado.status === "sucesso" ? (
        <>
          <p
            role="status"
            className="mt-3 inline-flex rounded-full bg-surface-brand-soft px-3 py-1 text-sm font-semibold text-fg-strong"
          >
            {novas.length} novos pedidos
          </p>
          {novas.length === 0 ? (
            <p className="mt-3 text-sm text-fg-muted">Nenhum novo pedido.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {novas.map((n) => (
                <li
                  key={n.id}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <span className="text-sm text-fg-strong">
                    Novo pedido {n.pedidoId.slice(0, 8)}{" "}
                    <time dateTime={n.criadoEm} className="text-fg-muted">
                      {new Date(n.criadoEm).toLocaleString("pt-BR")}
                    </time>
                  </span>
                  <button
                    type="button"
                    className={BOTAO_SECUNDARIO}
                    disabled={marcando !== null}
                    onClick={() => {
                      void marcarComoLida(n.id);
                    }}
                  >
                    {marcando === n.id ? "Salvando..." : "Marcar como lida"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
      {erroLeitura ? (
        <p role="alert">Não foi possível marcar como lida. Tente novamente.</p>
      ) : null}
    </section>
  );
}

"use client";

import type { IndicadoresArtesaoService } from "@/services/contracts/indicadores-artesao.contract";
import { useIndicadoresArtesao } from "@/hooks/use-indicadores-artesao";
import { formatarMoeda } from "@/utils/formatar-moeda";
import { BOTAO_SECUNDARIO_PEQUENO } from "@/components/formulario/estilos-botao";

const FORMATADOR_DATA = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Recife",
});

export function IndicadoresArtesaoCard({
  service,
}: {
  service: IndicadoresArtesaoService;
}) {
  const { estado, recarregar } = useIndicadoresArtesao(service);
  return (
    <section
      aria-label="Indicadores de vendas"
      className="min-w-0 rounded-card border border-border-subtle bg-surface-card p-5 shadow-card md:p-6"
    >
      <h2 className="m-0 font-display text-xl font-semibold text-fg-strong">
        Indicadores de vendas
      </h2>
      {estado.status === "carregando" ? (
        <p role="status" className="mb-0 mt-4 text-sm text-fg-muted">
          Carregando indicadores…
        </p>
      ) : estado.status === "erro" ? (
        <div className="mt-4 flex flex-col items-start gap-3">
          <p role="alert" className="m-0 text-sm text-erro-700">
            Não foi possível carregar os indicadores.
          </p>
          <button
            type="button"
            className={BOTAO_SECUNDARIO_PEQUENO}
            onClick={recarregar}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {estado.status === "vazio" ? (
            <p className="mb-0 mt-4 text-sm text-fg-muted">
              Nenhuma venda ainda
            </p>
          ) : null}
          <dl className="mb-0 mt-5 grid min-w-0 gap-5 sm:grid-cols-3">
            <div className="min-w-0">
              <dt className="text-sm text-fg-muted">Quantidade vendida</dt>
              <dd className="m-0 mt-2 break-words font-display text-3xl font-semibold tabular-nums text-fg-strong">
                {estado.dados.quantidadeVendida}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-sm text-fg-muted">Receita total</dt>
              <dd className="m-0 mt-2 break-words font-display text-3xl font-semibold tabular-nums text-fg-strong">
                {formatarMoeda(estado.dados.receitaTotal)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-sm text-fg-muted">Pedidos</dt>
              <dd className="m-0 mt-2 break-words font-display text-3xl font-semibold tabular-nums text-fg-strong">
                {estado.dados.numeroPedidos}
              </dd>
            </div>
          </dl>
          <p className="mb-0 mt-5 text-sm text-fg-muted">
            Atualizado em{" "}
            <time dateTime={estado.dados.atualizadoEm}>
              {FORMATADOR_DATA.format(new Date(estado.dados.atualizadoEm))}
            </time>
          </p>
        </>
      )}
    </section>
  );
}
